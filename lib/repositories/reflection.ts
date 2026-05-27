import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import {
  formationVerdictSchema,
  identitySchema,
  journalEntrySchema,
  lessonProgressSchema,
  preferencesSchema,
  weeklyReviewSchema,
  type JournalEntryInput,
  type PreferencesInput,
  type WeeklyReviewInput,
} from "@/lib/contracts/domain";
import { logger, redactUserId } from "@/lib/logger";
import { listHabits } from "@/lib/repositories/habits";
import type {
  FormationVerdict,
  Identity,
  JournalEntry,
  StoreSnapshot,
  UserPreferences,
  WeeklyReview,
  WeeklyReviewAnswers,
} from "@/lib/types";

type DbClient = typeof defaultDb;

const defaultPreferences: UserPreferences = {
  theme: "light",
  accentHue: 60,
  remindersEnabled: true,
  weeklyReviewNudge: true,
  accountabilityNudge: false,
  onboardingSeen: false,
  lessonMode: "sequential",
  timezone: "UTC",
};

const log = logger.child({ module: "repo.reflection" });

export const emptyWeeklyReview: WeeklyReviewAnswers = {
  wentWell: "",
  smallestFix: "",
  identityVote: "",
};

function toWeeklyReview(record: {
  weekStartKey: string;
  wentWell: string;
  smallestFix: string;
  identityVote: string;
  updatedAt: Date;
}): WeeklyReview {
  return {
    weekStartKey: record.weekStartKey,
    wentWell: record.wentWell,
    smallestFix: record.smallestFix,
    identityVote: record.identityVote,
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toJournalEntry(record: {
  id: string;
  dateKey: string;
  title: string;
  body: string;
  mood: string;
  tags: string[];
}): JournalEntry {
  return {
    id: record.id,
    date: record.dateKey,
    title: record.title,
    body: record.body,
    mood: record.mood,
    tags: record.tags,
  };
}

function toPreferences(record: Partial<UserPreferences> | null | undefined): UserPreferences {
  return {
    ...defaultPreferences,
    ...record,
  };
}

function toFormationVerdict(record: {
  habitId: string;
  score: number;
  reflection: string;
  decision: string;
  reviewedAt: Date;
}): FormationVerdict {
  return {
    habitId: record.habitId,
    score: record.score,
    reflection: record.reflection,
    formed: record.decision === "formed",
    reviewedAt: record.reviewedAt.toISOString(),
  };
}

export async function getIdentity(userId: string, db: DbClient = defaultDb): Promise<Identity> {
  log.debug("Getting identity", { event: "repo.identity.get", userId: redactUserId(userId) });
  validateDatabaseUrl();

  const record = await db.identityProfile.upsert({
    where: { userId },
    create: { userId, statement: "", values: [] },
    update: {},
  });

  return { statement: record.statement, values: record.values };
}

export async function saveIdentity(userId: string, input: Identity, db: DbClient = defaultDb) {
  log.debug("Saving identity", {
    event: "repo.identity.save",
    userId: redactUserId(userId),
    valueCount: input.values.length,
  });
  validateDatabaseUrl();
  const data = identitySchema.parse(input);

  const record = await db.identityProfile.upsert({
    where: { userId },
    create: { userId, statement: data.statement, values: data.values },
    update: { statement: data.statement, values: data.values },
  });

  return { statement: record.statement, values: record.values };
}

export async function listJournalEntries(userId: string, db: DbClient = defaultDb) {
  log.debug("Listing journal entries", { event: "repo.journal.list", userId: redactUserId(userId) });
  validateDatabaseUrl();

  const records = await db.journalEntry.findMany({
    where: { userId },
    orderBy: [{ dateKey: "desc" }, { createdAt: "desc" }],
  });

  return records.map(toJournalEntry);
}

export async function createJournalEntry(userId: string, input: JournalEntryInput, db: DbClient = defaultDb) {
  log.debug("Creating journal entry", {
    event: "repo.journal.create",
    userId: redactUserId(userId),
    dateKey: input.dateKey,
    hasTags: input.tags.length > 0,
  });
  validateDatabaseUrl();
  const data = journalEntrySchema.parse(input);

  const record = await db.journalEntry.create({
    data: {
      userId,
      dateKey: data.dateKey,
      title: data.title,
      body: data.body,
      mood: data.mood,
      tags: data.tags,
    },
  });

  return toJournalEntry(record);
}

export async function updateJournalEntry(
  userId: string,
  entryId: string,
  input: Partial<JournalEntryInput>,
  db: DbClient = defaultDb,
) {
  log.debug("Updating journal entry", {
    event: "repo.journal.update",
    userId: redactUserId(userId),
    entryId,
    dateKey: input.dateKey,
    updatesMood: input.mood !== undefined,
    updatesTags: input.tags !== undefined,
  });
  validateDatabaseUrl();
  const current = await db.journalEntry.findFirst({ where: { id: entryId, userId } });

  if (!current) {
    return null;
  }

  const data = journalEntrySchema.partial().parse(input);
  const record = await db.journalEntry.update({
    where: { id: entryId },
    data: {
      ...(data.dateKey !== undefined ? { dateKey: data.dateKey } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.body !== undefined ? { body: data.body } : {}),
      ...(data.mood !== undefined ? { mood: data.mood } : {}),
      ...(data.tags !== undefined ? { tags: data.tags } : {}),
    },
  });

  return toJournalEntry(record);
}

export async function getWeeklyReview(userId: string, weekStartKey: string, db: DbClient = defaultDb) {
  log.debug("Getting weekly review", {
    event: "repo.weeklyReview.get",
    userId: redactUserId(userId),
    weekStartKey,
  });
  validateDatabaseUrl();

  const record = await db.weeklyReview.findUnique({
    where: { userId_weekStartKey: { userId, weekStartKey } },
  });

  return record
    ? toWeeklyReview(record)
    : emptyWeeklyReview;
}

export async function listWeeklyReviews(userId: string, db: DbClient = defaultDb) {
  log.debug("Listing weekly reviews", { event: "repo.weeklyReview.list", userId: redactUserId(userId) });
  validateDatabaseUrl();

  const records = await db.weeklyReview.findMany({
    where: { userId },
    orderBy: { weekStartKey: "desc" },
  });

  return records.map(toWeeklyReview);
}

export async function saveWeeklyReview(userId: string, input: WeeklyReviewInput, db: DbClient = defaultDb) {
  log.debug("Saving weekly review", {
    event: "repo.weeklyReview.save",
    userId: redactUserId(userId),
    weekStartKey: input.weekStartKey,
  });
  validateDatabaseUrl();
  const data = weeklyReviewSchema.parse(input);

  const record = await db.weeklyReview.upsert({
    where: { userId_weekStartKey: { userId, weekStartKey: data.weekStartKey } },
    create: {
      userId,
      weekStartKey: data.weekStartKey,
      wentWell: data.wentWell,
      smallestFix: data.smallestFix,
      identityVote: data.identityVote,
    },
    update: {
      wentWell: data.wentWell,
      smallestFix: data.smallestFix,
      identityVote: data.identityVote,
    },
  });

  return toWeeklyReview(record);
}

export async function listCompletedLessons(userId: string, db: DbClient = defaultDb) {
  log.debug("Listing completed lessons", { event: "repo.lesson.list", userId: redactUserId(userId) });
  validateDatabaseUrl();

  const records = await db.lessonProgress.findMany({
    where: { userId },
    orderBy: { lessonId: "asc" },
  });

  return records.map((record) => record.lessonId);
}

export async function markLessonComplete(userId: string, lessonId: number, db: DbClient = defaultDb) {
  log.debug("Marking lesson complete", {
    event: "repo.lesson.complete",
    userId: redactUserId(userId),
    lessonId,
  });
  validateDatabaseUrl();
  const data = lessonProgressSchema.parse({ lessonId });

  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId: data.lessonId } },
    create: { userId, lessonId: data.lessonId },
    update: { completedAt: new Date() },
  });

  return listCompletedLessons(userId, db);
}

export async function getPreferences(userId: string, db: DbClient = defaultDb) {
  log.debug("Getting preferences", { event: "repo.preferences.get", userId: redactUserId(userId) });
  validateDatabaseUrl();

  const record = await db.userPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  return toPreferences({
    theme: record.theme,
    accentHue: record.accentHue,
    remindersEnabled: record.remindersEnabled,
    weeklyReviewNudge: record.weeklyReviewNudge,
    accountabilityNudge: record.accountabilityNudge,
    onboardingSeen: record.onboardingSeen,
    lessonMode: record.lessonMode,
    timezone: record.timezone,
  });
}

export async function savePreferences(userId: string, input: PreferencesInput, db: DbClient = defaultDb) {
  log.debug("Saving preferences", {
    event: "repo.preferences.save",
    userId: redactUserId(userId),
    theme: input.theme,
    remindersEnabled: input.remindersEnabled,
    timezone: input.timezone,
  });
  validateDatabaseUrl();
  const data = preferencesSchema.parse(input);

  const record = await db.userPreference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return toPreferences({
    theme: record.theme,
    accentHue: record.accentHue,
    remindersEnabled: record.remindersEnabled,
    weeklyReviewNudge: record.weeklyReviewNudge,
    accountabilityNudge: record.accountabilityNudge,
    onboardingSeen: record.onboardingSeen,
    lessonMode: record.lessonMode,
    timezone: record.timezone,
  });
}

export async function listFormationVerdicts(userId: string, db: DbClient = defaultDb) {
  log.debug("Listing formation verdicts", { event: "repo.formationVerdict.list", userId: redactUserId(userId) });
  validateDatabaseUrl();

  const records = await db.formationVerdict.findMany({
    where: { userId },
    orderBy: { reviewedAt: "desc" },
  });

  return records.map(toFormationVerdict);
}

export async function saveFormationVerdict(userId: string, input: FormationVerdict, db: DbClient = defaultDb) {
  log.debug("Saving formation verdict", {
    event: "repo.formationVerdict.save",
    userId: redactUserId(userId),
    habitId: input.habitId,
  });
  validateDatabaseUrl();
  const data = formationVerdictSchema.parse(input);
  const habit = await db.habit.findFirst({ where: { id: data.habitId, userId } });

  if (!habit) {
    return null;
  }

  const record = await db.formationVerdict.upsert({
    where: { habitId: data.habitId },
    create: {
      userId,
      habitId: data.habitId,
      score: data.score,
      reflection: data.reflection,
      decision: data.formed ? "formed" : "keep_practicing",
      reviewedAt: data.reviewedAt ? new Date(data.reviewedAt) : new Date(),
    },
    update: {
      score: data.score,
      reflection: data.reflection,
      decision: data.formed ? "formed" : "keep_practicing",
      reviewedAt: data.reviewedAt ? new Date(data.reviewedAt) : new Date(),
    },
  });

  return toFormationVerdict(record);
}

export async function getStoreSnapshot(userId: string, weekStartKey: string, db: DbClient = defaultDb): Promise<StoreSnapshot> {
  log.debug("Getting store snapshot", {
    event: "repo.snapshot.get",
    userId: redactUserId(userId),
    weekStartKey,
  });
  validateDatabaseUrl();

  const [habits, journal, identity, weeklyReview, weeklyReviews, completedLessons, formationVerdicts, preferences] = await Promise.all([
    listHabits(userId, db),
    listJournalEntries(userId, db),
    getIdentity(userId, db),
    getWeeklyReview(userId, weekStartKey, db),
    listWeeklyReviews(userId, db),
    listCompletedLessons(userId, db),
    listFormationVerdicts(userId, db),
    getPreferences(userId, db),
  ]);

  return {
    habits,
    journal,
    identity,
    weeklyReview,
    weeklyReviews,
    completedLessons,
    formationVerdicts,
    preferences,
  };
}

export { defaultPreferences, toDateKey };
