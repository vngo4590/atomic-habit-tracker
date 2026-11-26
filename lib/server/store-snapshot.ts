import "server-only";

/**
 * Store snapshot — the server-side composition root for the client store.
 *
 * `app/(root)/layout.tsx` (and the `/api/v1/export` backup route) call
 * `getStoreSnapshot` once per request to load everything the signed-in user's
 * screens need. It only stitches together each feature's public `server`
 * entry point, so no single feature has to know about all the others.
 */

import { listFormationVerdicts, listHabits } from "@/features/habits/server";
import { countFeedsUsedToday, listPets } from "@/features/pet/server";
import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import { todayKey } from "@/lib/helpers";
import { logger, redactUserId } from "@/lib/logger";
import {
  getIdentity,
  getPreferences,
  getWeeklyReview,
  listCompletedLessons,
  listJournalEntries,
  listWeeklyReviews,
} from "@/lib/repositories/reflection";
import type { StoreSnapshot } from "@/lib/types";

type DbClient = typeof defaultDb;

// Keep the original module name so existing log queries and dashboards still match.
const log = logger.child({ module: "repo.reflection" });

export async function getStoreSnapshot(userId: string, weekStartKey: string, db: DbClient = defaultDb): Promise<StoreSnapshot> {
  log.debug("Getting store snapshot", {
    event: "repo.snapshot.get",
    userId: redactUserId(userId),
    weekStartKey,
  });
  validateDatabaseUrl();

  // The pet ecosystem decays in real time and is funded by today's habit
  // completions, so we load it against "now" and today's date key.
  const now = Date.now();
  const petsDateKey = todayKey();

  const [habits, journal, identity, weeklyReview, weeklyReviews, completedLessons, formationVerdicts, preferences, pets, petFeedsUsedToday] = await Promise.all([
    listHabits(userId, db),
    listJournalEntries(userId, db),
    getIdentity(userId, db),
    getWeeklyReview(userId, weekStartKey, db),
    listWeeklyReviews(userId, db),
    listCompletedLessons(userId, db),
    listFormationVerdicts(userId, db),
    getPreferences(userId, db),
    listPets(userId, now, db),
    countFeedsUsedToday(userId, petsDateKey, db),
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
    pets,
    petFeedsUsedToday,
  };
}
