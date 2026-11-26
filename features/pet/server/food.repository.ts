import "server-only";

/**
 * Pet food repository - the shared daily food pool. Food is EARNED from today's
 * habit completions and journalling, and SPENT by feeding any pet (tracked via
 * `PetFeedLog` rows), so `available = earned - used`.
 */

import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";

import { earnedFoodFrom } from "../model/food";
import type { DbClient } from "./pet-mapper";

/** Sum of all feeds spent by a user today — the consumed half of the food pool. */
export async function countFeedsUsedToday(userId: string, dateKey: string, db: DbClient = defaultDb): Promise<number> {
  validateDatabaseUrl();
  const aggregate = await db.petFeedLog.aggregate({
    _sum: { amount: true },
    where: { userId, dateKey },
  });
  return aggregate._sum.amount ?? 0;
}

/** Count habits the user completed today — the primary half of the food pool. */
async function countCompletedHabitsToday(userId: string, dateKey: string, db: DbClient): Promise<number> {
  return db.habitCheckIn.count({ where: { userId, dateKey, done: true } });
}

/**
 * The inclusive local-day window [start, end) that contains `now`, used to count
 * activities (like weekly reviews) that are stamped by `updatedAt` rather than a
 * YYYY-MM-DD dateKey.
 */
function localDayWindow(now: number): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * Total food the user has EARNED today across every source: completed habits
 * (worth the most) plus reflective activities (Journal entries, habit journal
 * notes, and weekly reviews) — each worth a little extra. This is the authoritative
 * server-side mirror of the pure `earnedFoodFrom` formula the client also uses.
 */
export async function countEarnedFoodToday(
  userId: string,
  dateKey: string,
  now: number,
  db: DbClient = defaultDb,
): Promise<number> {
  validateDatabaseUrl();
  const { start, end } = localDayWindow(now);

  const [habitsCompleted, journalEntries, habitJournals, weeklyReviews] = await Promise.all([
    countCompletedHabitsToday(userId, dateKey, db),
    db.journalEntry.count({ where: { userId, dateKey } }),
    // A habit check-in counts as journalling only when it actually carries a note.
    db.habitCheckIn.count({ where: { userId, dateKey, journal: { not: null } } }),
    // Weekly reviews have no dateKey, so we count those saved within today's window.
    db.weeklyReview.count({ where: { userId, updatedAt: { gte: start, lt: end } } }),
  ]);

  return earnedFoodFrom({ habitsCompleted, journalEntries, habitJournals, weeklyReviews });
}
