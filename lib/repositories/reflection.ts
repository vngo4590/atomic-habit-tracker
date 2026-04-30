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
import type {
  FormationVerdict,
  Identity,
  JournalEntry,
  StoreSnapshot,
  UserPreferences,
  WeeklyReviewAnswers,
} from "@/lib/types";
import { listHabits } from "@/lib/repositories/habits";

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

export const emptyWeeklyReview: WeeklyReviewAnswers = {
  wentWell: "",
  smallestFix: "",
  identityVote: "",
};

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
  validateDatabaseUrl();

  const record = await db.identityProfile.upsert({
    where: { userId },
    create: { userId, statement: "", values: [] },
    update: {},
  });

  return { statement: record.statement, values: record.values };
}

export async function saveIdentity(userId: string, input: Identity, db: DbClient = defaultDb) {
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
  validateDatabaseUrl();

  const records = await db.journalEntry.findMany({
    where: { userId },
    orderBy: [{ dateKey: "desc" }, { createdAt: "desc" }],
  });

  return records.map(toJournalEntry);
}

export async function createJournalEntry(userId: string, input: JournalEntryInput, db: DbClient = defaultDb) {
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

export async function getWeeklyReview(userId: string, weekStartKey: string, db: DbClient = defaultDb) {
  validateDatabaseUrl();

  const record = await db.weeklyReview.findUnique({
    where: { userId_weekStartKey: { userId, weekStartKey } },
  });

  return record
    ? {
        wentWell: record.wentWell,
        smallestFix: record.smallestFix,
        identityVote: record.identityVote,
      }
    : emptyWeeklyReview;
}

export async function saveWeeklyReview(userId: string, input: WeeklyReviewInput, db: DbClient = defaultDb) {
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

  return {
    wentWell: record.wentWell,
    smallestFix: record.smallestFix,
    identityVote: record.identityVote,
  };
}

export async function listCompletedLessons(userId: string, db: DbClient = defaultDb) {
  validateDatabaseUrl();

  const records = await db.lessonProgress.findMany({
    where: { userId },
    orderBy: { lessonId: "asc" },
  });

  return records.map((record) => record.lessonId);
}

export async function markLessonComplete(userId: string, lessonId: number, db: DbClient = defaultDb) {
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
  validateDatabaseUrl();

  const records = await db.formationVerdict.findMany({
    where: { userId },
    orderBy: { reviewedAt: "desc" },
  });

  return records.map(toFormationVerdict);
}

export async function saveFormationVerdict(userId: string, input: FormationVerdict, db: DbClient = defaultDb) {
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
  validateDatabaseUrl();

  const [habits, journal, identity, weeklyReview, completedLessons, formationVerdicts, preferences] = await Promise.all([
    listHabits(userId, db),
    listJournalEntries(userId, db),
    getIdentity(userId, db),
    getWeeklyReview(userId, weekStartKey, db),
    listCompletedLessons(userId, db),
    listFormationVerdicts(userId, db),
    getPreferences(userId, db),
  ]);

  return {
    habits,
    journal,
    identity,
    weeklyReview,
    completedLessons,
    formationVerdicts,
    preferences,
  };
}

export { defaultPreferences, toDateKey };
