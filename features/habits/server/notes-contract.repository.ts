import "server-only";

/**
 * Notes and contract repository — saves the free-text notes attached to a
 * habit and the habit's accountability contract (terms + partners). Both are
 * stored as part of the habit and returned in the same `Habit` shape.
 */

import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import { logger, redactUserId } from "@/lib/logger";
import type { Note } from "@/lib/types";

import { contractSchema, noteSchema } from "../contracts";
import { getHabit, updateHabit } from "./habits.repository";

type DbClient = typeof defaultDb;

const log = logger.child({ module: "repo.habits" });

export async function replaceNotes(userId: string, habitId: string, notes: Note[], db: DbClient = defaultDb) {
  log.debug("Replacing habit notes", {
    event: "repo.habit.note.replace",
    userId: redactUserId(userId),
    habitId,
    noteCount: notes.length,
  });
  return updateHabit(userId, habitId, { notes }, db);
}

export async function addNote(userId: string, habitId: string, body: string, db: DbClient = defaultDb) {
  log.debug("Adding habit note", { event: "repo.habit.note.add", userId: redactUserId(userId), habitId });
  validateDatabaseUrl();
  const data = noteSchema.parse({ body });
  const habit = await getHabit(userId, habitId, db);

  if (!habit) {
    return null;
  }

  await db.habitNote.create({ data: { userId, habitId, body: data.body } });
  return getHabit(userId, habitId, db);
}

export async function saveContract(
  userId: string,
  habitId: string,
  input: { terms: string; partners: string[] },
  db: DbClient = defaultDb,
) {
  log.debug("Saving habit contract", {
    event: "repo.habit.contract.save",
    userId: redactUserId(userId),
    habitId,
    hasTerms: Boolean(input.terms),
    partnerCount: input.partners.length,
  });
  const data = contractSchema.parse(input);
  return updateHabit(userId, habitId, { contract: data.terms, contractPartners: data.partners }, db);
}
