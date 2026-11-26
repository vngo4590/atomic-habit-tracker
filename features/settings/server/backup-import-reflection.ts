import "server-only";

import type { BackupData } from "../contracts";
import { toDate, type ImportSummary, type Tx } from "./backup-import-shared";

/** Upsert journal entries by id. */
export async function importJournal(tx: Tx, userId: string, data: BackupData, summary: ImportSummary) {
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
export async function importIdentity(tx: Tx, userId: string, data: BackupData, summary: ImportSummary) {
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
export async function importPreferences(tx: Tx, userId: string, data: BackupData, summary: ImportSummary) {
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
export async function importWeeklyReviews(tx: Tx, userId: string, data: BackupData, summary: ImportSummary) {
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
export async function importLessons(tx: Tx, userId: string, data: BackupData, summary: ImportSummary) {
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
export async function importFormationVerdicts(tx: Tx, userId: string, data: BackupData, summary: ImportSummary) {
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
