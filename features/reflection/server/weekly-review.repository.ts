import "server-only";

/**
 * Weekly review repository — one review per user per week (`WeeklyReview`).
 */

import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import { logger, redactUserId } from "@/lib/logger";
import type { WeeklyReview, WeeklyReviewAnswers } from "@/lib/types";

import { weeklyReviewSchema, type WeeklyReviewInput } from "../contracts";

type DbClient = typeof defaultDb;

// Keep the original module name so existing log queries and dashboards still match.
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
