import "server-only";

/**
 * Formation verdicts repository — stores the Hall of Fame decision for a habit:
 * after a review the user scores the habit and decides whether it is "formed"
 * (inducted, which frees an active-habit slot) or needs more practice.
 */

import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import { logger, redactUserId } from "@/lib/logger";
import type { FormationVerdict } from "@/lib/types";

import { formationVerdictSchema } from "../contracts";

type DbClient = typeof defaultDb;

// Keep the original module name so existing log queries and dashboards still match.
const log = logger.child({ module: "repo.reflection" });

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
