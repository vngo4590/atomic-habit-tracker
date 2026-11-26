import "server-only";

import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import { logger, redactUserId } from "@/lib/logger";

import { backupEnvelopeSchema } from "../contracts";
import { importHabits } from "./backup-import-habits";
import {
  importFormationVerdicts,
  importIdentity,
  importJournal,
  importLessons,
  importPreferences,
  importWeeklyReviews,
} from "./backup-import-reflection";
import { emptySummary, type DbClient, type ImportSummary } from "./backup-import-shared";

export type { ImportSummary } from "./backup-import-shared";

const log = logger.child({ module: "backup.import" });

/**
 * Restore a previously-exported backup into a user's account using MERGE
 * semantics: every record is upserted by its own id / natural key, so importing
 * adds what's missing and refreshes what's present, but never deletes existing
 * data. Re-importing the same file is therefore a harmless no-op (idempotent).
 *
 * The whole restore runs inside a single transaction: if any block fails the
 * account is left exactly as it was. Records that would collide with a different
 * user's data, or that reference a parent habit that doesn't exist, are skipped
 * (and counted) rather than aborting the import.
 *
 * Pets are intentionally NOT imported — the ecosystem is procedural, mortal, and
 * has adoption caps that a restore would violate, so the `pets` block is ignored.
 *
 * @param userId   The owner the imported data is attributed to.
 * @param envelope The raw (untrusted) parsed JSON; validated here before any write.
 * @param db       Prisma client (injectable for tests).
 */
export async function mergeBackup(
  userId: string,
  envelope: unknown,
  db: DbClient = defaultDb,
): Promise<ImportSummary> {
  validateDatabaseUrl();

  // Validate the entire file up front. A foreign or corrupt file throws here,
  // before the transaction opens, so nothing is ever partially written.
  const parsed = backupEnvelopeSchema.parse(envelope);
  const data = parsed.data;

  log.info("Importing backup", {
    event: "backup.import.start",
    userId: redactUserId(userId),
    habitCount: data.habits.length,
    journalCount: data.journal.length,
  });

  const summary = await db.$transaction(async (tx) => {
    const result = emptySummary();

    await importHabits(tx, userId, data, result);
    await importJournal(tx, userId, data, result);
    await importIdentity(tx, userId, data, result);
    await importPreferences(tx, userId, data, result);
    await importWeeklyReviews(tx, userId, data, result);
    await importLessons(tx, userId, data, result);
    await importFormationVerdicts(tx, userId, data, result);

    return result;
  });

  log.info("Backup imported", {
    event: "backup.import.done",
    userId: redactUserId(userId),
    ...summary,
  });

  return summary;
}
