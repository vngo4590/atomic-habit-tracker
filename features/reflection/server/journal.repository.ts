import "server-only";

/**
 * Journal repository — free-form journal entries (`JournalEntry`).
 */

import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import { logger, redactUserId } from "@/lib/logger";
import type { JournalEntry } from "@/lib/types";

import { journalEntrySchema, type JournalEntryInput } from "../contracts";

type DbClient = typeof defaultDb;

// Keep the original module name so existing log queries and dashboards still match.
const log = logger.child({ module: "repo.reflection" });

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
