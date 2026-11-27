import "server-only";

/**
 * Check-ins repository — records whether a habit was done on a given day,
 * plus the optional mood and journal line for that day. Clearing a day with
 * no mood or journal removes the row entirely so history stays tidy.
 */

import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import { logger, redactUserId } from "@/lib/logger";
import type { CheckIn } from "@/lib/types";

import { checkInSchema, type CheckInInput } from "../contracts";
import { getHabit } from "./habits.repository";

type DbClient = typeof defaultDb;

const log = logger.child({ module: "repo.habits" });

export async function upsertCheckIn(userId: string, habitId: string, input: CheckInInput, db: DbClient = defaultDb) {
  log.debug("Upserting habit check-in", {
    event: "repo.habit.checkIn.upsert",
    userId: redactUserId(userId),
    habitId,
    dateKey: input.dateKey,
    done: input.done,
    hasJournal: Boolean(input.journal),
    hasMood: input.mood !== undefined && input.mood !== null,
  });
  validateDatabaseUrl();
  const data = checkInSchema.parse(input);
  const habit = await getHabit(userId, habitId, db);

  if (!habit) {
    return null;
  }

  if (!data.done && !data.mood && !data.journal) {
    await db.habitCheckIn.deleteMany({ where: { userId, habitId, dateKey: data.dateKey } });
    return getHabit(userId, habitId, db);
  }

  await db.habitCheckIn.upsert({
    where: { habitId_dateKey: { habitId, dateKey: data.dateKey } },
    create: {
      userId,
      habitId,
      dateKey: data.dateKey,
      done: data.done,
      mood: data.mood ?? null,
      journal: data.journal ?? null,
    },
    update: {
      done: data.done,
      mood: data.mood ?? null,
      journal: data.journal ?? null,
    },
  });

  return getHabit(userId, habitId, db);
}

export type { CheckIn };
