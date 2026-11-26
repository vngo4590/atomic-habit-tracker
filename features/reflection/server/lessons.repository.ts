import "server-only";

/**
 * Lessons repository — which Atomic Habits lessons the user has read
 * (`LessonProgress`).
 */

import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import { logger, redactUserId } from "@/lib/logger";

import { lessonProgressSchema } from "../contracts";

type DbClient = typeof defaultDb;

// Keep the original module name so existing log queries and dashboards still match.
const log = logger.child({ module: "repo.reflection" });

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
