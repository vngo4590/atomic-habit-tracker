"use server";

/**
 * Server actions for the reflection side of the app: journal entries, weekly
 * reviews, identity and lessons. Preferences live in `@/features/settings/actions`;
 * habit and stack actions live in their feature slices
 * (`@/features/habits/actions`, `@/features/stacks/actions`).
 */

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/session";
import { logger, redactUserId } from "@/lib/logger";
import {
  createJournalEntry,
  markLessonComplete,
  saveIdentity,
  saveWeeklyReview,
  updateJournalEntry,
} from "./server";
import type {
  Identity,
  JournalEntry,
  WeeklyReviewAnswers,
} from "@/lib/types";

const log = logger.child({ module: "actions.domain" });

export async function createJournalEntryAction(entry: Partial<JournalEntry>) {
  const userId = await requireUserId();
  log.info("Creating journal entry", { event: "journal.created", userId: redactUserId(userId) });
  const journalEntry = await createJournalEntry(userId, {
    dateKey: entry.date ?? new Date().toISOString().slice(0, 10),
    title: entry.title ?? "",
    body: entry.body ?? "",
    mood: entry.mood ?? "good",
    tags: entry.tags ?? [],
  });

  revalidatePath("/journal");
  return journalEntry;
}

export async function updateJournalEntryAction(entryId: string, patch: Partial<JournalEntry>) {
  const userId = await requireUserId();
  log.info("Updating journal entry", { event: "journal.updated", userId: redactUserId(userId), entryId });
  // Journal entries are anchored to the day they happened. The dateKey is
  // set on creation and never editable afterwards, so we deliberately
  // ignore `patch.date` here even if the caller sends it.
  const journalEntry = await updateJournalEntry(userId, entryId, {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.body !== undefined ? { body: patch.body } : {}),
    ...(patch.mood !== undefined ? { mood: patch.mood } : {}),
    ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
  });

  revalidatePath("/journal");
  return journalEntry;
}

export async function saveWeeklyReviewAction(weekStartKey: string, answers: WeeklyReviewAnswers) {
  const userId = await requireUserId();
  log.info("Saving weekly review", { event: "review.saved", userId: redactUserId(userId), weekStartKey });
  const review = await saveWeeklyReview(userId, { weekStartKey, ...answers });

  revalidatePath("/review");
  return review;
}

export async function saveIdentityAction(identity: Identity) {
  const userId = await requireUserId();
  log.info("Saving identity", { event: "identity.saved", userId: redactUserId(userId) });
  const saved = await saveIdentity(userId, identity);

  revalidatePath("/");
  revalidatePath("/identity");
  revalidatePath("/habits/new");
  return saved;
}

export async function markLessonReadAction(lessonId: number) {
  const userId = await requireUserId();
  log.info("Marking lesson read", { event: "lesson.completed", userId: redactUserId(userId), lessonId });
  const completed = await markLessonComplete(userId, lessonId);

  revalidatePath("/lessons");
  return completed;
}
