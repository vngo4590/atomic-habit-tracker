import "server-only";

import type { BackupData, BackupHabit } from "../contracts";
import { toDate, type ImportSummary, type Tx } from "./backup-import-shared";

/**
 * Restore habits and their nested check-ins, notes, and contract. Stack links
 * are applied in a second pass once every habit exists so the `stackNextId`
 * unique constraint and FK are never violated mid-import.
 */
export async function importHabits(tx: Tx, userId: string, data: BackupData, summary: ImportSummary) {
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
