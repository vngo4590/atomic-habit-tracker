import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import { backupEnvelopeSchema, type BackupData, type BackupHabit } from "@/lib/contracts/backup";
import { logger, redactUserId } from "@/lib/logger";

type DbClient = typeof defaultDb;

/**
 * Per-category counts returned after a merge import so the UI can tell the user
 * exactly what was restored (e.g. "12 habits, 340 check-ins").
 */
export interface ImportSummary {
  habits: number;
  checkIns: number;
  notes: number;
  contracts: number;
  journal: number;
  weeklyReviews: number;
  lessons: number;
  formationVerdicts: number;
  identity: boolean;
  preferences: boolean;
  /** Records skipped because they collided with another user or referenced a missing parent. */
  skipped: number;
}

const log = logger.child({ module: "backup.import" });

function emptySummary(): ImportSummary {
  return {
    habits: 0,
    checkIns: 0,
    notes: 0,
    contracts: 0,
    journal: 0,
    weeklyReviews: 0,
    lessons: 0,
    formationVerdicts: 0,
    identity: false,
    preferences: false,
    skipped: 0,
  };
}

/** Convert a YYYY-MM-DD (or ISO) string into a UTC midnight Date for DateTime columns. */
function toDate(value: string): Date {
  // Date keys ("2026-06-02") need an explicit time so they don't drift by zone.
  const normalized = value.length === 10 ? `${value}T00:00:00.000Z` : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Restore a previously-exported backup into a user's account using MERGE
 * semantics: every record is upserted by its own id / natural key, so importing
 * adds what's missing and refreshes what's present, but never deletes existing
 * data. Re-importing the same file is therefore a harmless no-op (idempotent).
 *
 * The whole restore runs inside a single transaction: if any block fails the
 * account is left exactly as it was. Records that would collide with a different
 * user's data, or that reference a parent habit that doesn't exist, are skipped
 * (and counted) rather than aborting the import.
 *
 * Pets are intentionally NOT imported — the ecosystem is procedural, mortal, and
 * has adoption caps that a restore would violate, so the `pets` block is ignored.
 *
 * @param userId   The owner the imported data is attributed to.
 * @param envelope The raw (untrusted) parsed JSON; validated here before any write.
 * @param db       Prisma client (injectable for tests).
 */
export async function mergeBackup(
  userId: string,
  envelope: unknown,
  db: DbClient = defaultDb,
): Promise<ImportSummary> {
  validateDatabaseUrl();

  // Validate the entire file up front. A foreign or corrupt file throws here,
  // before the transaction opens, so nothing is ever partially written.
  const parsed = backupEnvelopeSchema.parse(envelope);
  const data = parsed.data;

  log.info("Importing backup", {
    event: "backup.import.start",
    userId: redactUserId(userId),
    habitCount: data.habits.length,
    journalCount: data.journal.length,
  });

  const summary = await db.$transaction(async (tx) => {
    const result = emptySummary();

    await importHabits(tx, userId, data, result);
    await importJournal(tx, userId, data, result);
    await importIdentity(tx, userId, data, result);
    await importPreferences(tx, userId, data, result);
    await importWeeklyReviews(tx, userId, data, result);
    await importLessons(tx, userId, data, result);
    await importFormationVerdicts(tx, userId, data, result);

    return result;
  });

  log.info("Backup imported", {
    event: "backup.import.done",
    userId: redactUserId(userId),
    ...summary,
  });

  return summary;
}

type Tx = Parameters<Parameters<DbClient["$transaction"]>[0]>[0];

/**
 * Restore habits and their nested check-ins, notes, and contract. Stack links
 * are applied in a second pass once every habit exists so the `stackNextId`
 * unique constraint and FK are never violated mid-import.
 */
async function importHabits(tx: Tx, userId: string, data: BackupData, summary: ImportSummary) {
  // The set of habit ids that legitimately belong to this user after import —
  // used to gate nested writes (a backup habit owned by someone else is skipped).
  const ownedHabitIds = new Set<string>();

  for (const habit of data.habits) {
    const existing = await tx.habit.findUnique({ where: { id: habit.id }, select: { userId: true } });
    if (existing && existing.userId !== userId) {
      // A different account already owns this id — never overwrite their data.
      summary.skipped += 1;
      continue;
    }

    const scalar = {
      name: habit.name,
      emoji: habit.emoji,
      cue: habit.cue,
      craving: habit.craving,
      response: habit.response,
      reward: habit.reward,
      loopCue: habit.loopCue,
      loopCraving: habit.loopCraving,
      loopResponse: habit.loopResponse,
      loopReward: habit.loopReward,
      twoMin: habit.twoMin,
      identity: habit.identity,
      environment: habit.environment,
      schedule: habit.schedule,
      time: habit.time,
    };

    // Upsert scalar fields only; stackNextId is deferred to the second pass.
    await tx.habit.upsert({
      where: { id: habit.id },
      create: { id: habit.id, userId, ...scalar, createdAt: toDate(habit.createdAt) },
      update: scalar,
    });
    ownedHabitIds.add(habit.id);
    summary.habits += 1;

    await importCheckIns(tx, userId, habit, summary);
    await importNotes(tx, userId, habit, summary);
    await importContract(tx, userId, habit, summary);
  }

  await applyStackLinks(tx, userId, data.habits, ownedHabitIds, summary);
}

/** Upsert each day's check-in for a habit by its (habitId, dateKey) natural key. */
async function importCheckIns(tx: Tx, userId: string, habit: BackupHabit, summary: ImportSummary) {
  for (const [dateKey, value] of Object.entries(habit.history)) {
    const done = typeof value === "boolean" ? value : value.done;
    const mood = typeof value === "boolean" ? null : value.mood ?? null;
    const journal = typeof value === "boolean" ? null : value.journal ?? null;

    // Skip empty entries (no completion, mood, or note) — nothing to record.
    if (!done && mood == null && !journal) continue;

    await tx.habitCheckIn.upsert({
      where: { habitId_dateKey: { habitId: habit.id, dateKey } },
      create: { userId, habitId: habit.id, dateKey, done, mood, journal },
      update: { done, mood, journal },
    });
    summary.checkIns += 1;
  }
}

/** Upsert habit notes by id so re-imports refresh rather than duplicate them. */
async function importNotes(tx: Tx, userId: string, habit: BackupHabit, summary: ImportSummary) {
  for (const note of habit.notes) {
    const existing = await tx.habitNote.findUnique({ where: { id: note.id }, select: { userId: true } });
    if (existing && existing.userId !== userId) {
      summary.skipped += 1;
      continue;
    }
    await tx.habitNote.upsert({
      where: { id: note.id },
      create: { id: note.id, userId, habitId: habit.id, body: note.body, createdAt: toDate(note.createdAt) },
      update: { body: note.body },
    });
    summary.notes += 1;
  }
}

/** Upsert a habit's accountability contract (one per habit). */
async function importContract(tx: Tx, userId: string, habit: BackupHabit, summary: ImportSummary) {
  // Only write a contract row when there is something to store.
  if (!habit.contract && habit.contractPartners.length === 0) return;
  await tx.habitContract.upsert({
    where: { habitId: habit.id },
    create: { userId, habitId: habit.id, terms: habit.contract, partners: habit.contractPartners },
    update: { terms: habit.contract, partners: habit.contractPartners },
  });
  summary.contracts += 1;
}

/**
 * Second-pass stack-link restore. For each backup habit that points to a next
 * habit, set the link only when it is safe: both habits are owned by the user,
 * the target isn't already claimed by a different predecessor, and the link
 * would not create a cycle. Unsafe links are skipped, never fatal.
 */
async function applyStackLinks(
  tx: Tx,
  userId: string,
  habits: BackupHabit[],
  ownedHabitIds: Set<string>,
  summary: ImportSummary,
) {
  // Current forward-link map for ALL of the user's habits, so cycle/exclusivity
  // checks account for existing links not present in the backup.
  const current = await tx.habit.findMany({ where: { userId }, select: { id: true, stackNextId: true } });
  const nextById = new Map<string, string | null>(current.map((h) => [h.id, h.stackNextId]));

  for (const habit of habits) {
    const target = habit.stackNextId;
    if (!target) continue;
    if (!ownedHabitIds.has(habit.id) || !nextById.has(target) || target === habit.id) {
      summary.skipped += 1;
      continue;
    }

    // Exclusivity: at most one habit may point to `target`.
    const claimedByOther = current.some((h) => h.id !== habit.id && h.stackNextId === target);
    if (claimedByOther) {
      summary.skipped += 1;
      continue;
    }

    // Cycle check: walking forward from `target` must not return to `habit`.
    if (wouldCycle(habit.id, target, nextById)) {
      summary.skipped += 1;
      continue;
    }

    await tx.habit.update({ where: { id: habit.id }, data: { stackNextId: target } });
    nextById.set(habit.id, target);
  }
}

/** Returns true if linking `habitId -> target` would form a cycle in the chain. */
function wouldCycle(habitId: string, target: string, nextById: Map<string, string | null>): boolean {
  let cursor: string | null = target;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === habitId) return true;
    if (seen.has(cursor)) break;
    seen.add(cursor);
    cursor = nextById.get(cursor) ?? null;
  }
  return false;
}

/** Upsert journal entries by id. */
async function importJournal(tx: Tx, userId: string, data: BackupData, summary: ImportSummary) {
  for (const entry of data.journal) {
    const existing = await tx.journalEntry.findUnique({ where: { id: entry.id }, select: { userId: true } });
    if (existing && existing.userId !== userId) {
      summary.skipped += 1;
      continue;
    }
    const fields = { dateKey: entry.date, title: entry.title, body: entry.body, mood: entry.mood, tags: entry.tags };
    await tx.journalEntry.upsert({
      where: { id: entry.id },
      create: { id: entry.id, userId, ...fields },
      update: fields,
    });
    summary.journal += 1;
  }
}

/** Restore the single identity profile (overwrites with the backup's value). */
async function importIdentity(tx: Tx, userId: string, data: BackupData, summary: ImportSummary) {
  if (!data.identity) return;
  const { statement = "", values = [] } = data.identity;
  await tx.identityProfile.upsert({
    where: { userId },
    create: { userId, statement, values },
    update: { statement, values },
  });
  summary.identity = true;
}

/** Restore user preferences, only touching the keys present in the backup. */
async function importPreferences(tx: Tx, userId: string, data: BackupData, summary: ImportSummary) {
  if (!data.preferences) return;
  const prefs = data.preferences;
  await tx.userPreference.upsert({
    where: { userId },
    create: { userId, ...prefs },
    update: prefs,
  });
  summary.preferences = true;
}

/** Upsert weekly reviews by (userId, weekStartKey). */
async function importWeeklyReviews(tx: Tx, userId: string, data: BackupData, summary: ImportSummary) {
  for (const review of data.weeklyReviews) {
    const fields = {
      wentWell: review.wentWell,
      smallestFix: review.smallestFix,
      identityVote: review.identityVote,
    };
    await tx.weeklyReview.upsert({
      where: { userId_weekStartKey: { userId, weekStartKey: review.weekStartKey } },
      create: { userId, weekStartKey: review.weekStartKey, ...fields },
      update: fields,
    });
    summary.weeklyReviews += 1;
  }
}

/** Upsert completed-lesson progress by (userId, lessonId). */
async function importLessons(tx: Tx, userId: string, data: BackupData, summary: ImportSummary) {
  for (const lessonId of data.completedLessons) {
    await tx.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId },
      update: {},
    });
    summary.lessons += 1;
  }
}

/**
 * Upsert formation verdicts by habitId. A verdict whose habit was not imported
 * / does not belong to the user is skipped (the FK would otherwise fail).
 */
async function importFormationVerdicts(tx: Tx, userId: string, data: BackupData, summary: ImportSummary) {
  for (const verdict of data.formationVerdicts) {
    const habit = await tx.habit.findFirst({ where: { id: verdict.habitId, userId }, select: { id: true } });
    if (!habit) {
      summary.skipped += 1;
      continue;
    }
    const fields = {
      score: verdict.score,
      reflection: verdict.reflection,
      decision: verdict.formed ? ("formed" as const) : ("keep_practicing" as const),
      reviewedAt: verdict.reviewedAt ? toDate(verdict.reviewedAt) : new Date(),
    };
    await tx.formationVerdict.upsert({
      where: { habitId: verdict.habitId },
      create: { userId, habitId: verdict.habitId, ...fields },
      update: fields,
    });
    summary.formationVerdicts += 1;
  }
}
