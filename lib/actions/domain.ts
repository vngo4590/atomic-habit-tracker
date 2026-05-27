"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/session";
import { logger, redactUserId } from "@/lib/logger";
import {
  createHabit,
  archiveHabit,
  updateHabit,
  upsertCheckIn,
  applyStackMutation,
} from "@/lib/repositories/habits";
import {
  createJournalEntry,
  markLessonComplete,
  saveFormationVerdict as saveFormationVerdictRecord,
  saveIdentity,
  savePreferences,
  saveWeeklyReview,
  updateJournalEntry,
} from "@/lib/repositories/reflection";
import type {
  CheckIn,
  FormationVerdict,
  Habit,
  HabitDraft,
  Identity,
  JournalEntry,
  LessonMode,
  UserPreferences,
  WeeklyReviewAnswers,
} from "@/lib/types";
import type { StackMutationInput } from "@/lib/contracts/domain";

const log = logger.child({ module: "actions.domain" });

function revalidateApp() {
  revalidatePath("/");
  revalidatePath("/habits");
  revalidatePath("/analytics");
  revalidatePath("/journal");
  revalidatePath("/review");
  revalidatePath("/lessons");
  revalidatePath("/identity");
  revalidatePath("/hall-of-fame");
  revalidatePath("/settings");
}

export async function createHabitAction(draft: HabitDraft) {
  const userId = await requireUserId();
  log.info("Creating habit", { event: "habit.created", userId: redactUserId(userId), habitName: draft.name });
  const habit = await createHabit(userId, {
    emoji: "•",
    cue: "",
    craving: "",
    response: draft.name,
    reward: "",
    loopCue: draft.cue ?? "",
    loopCraving: draft.craving ?? "",
    loopResponse: draft.response ?? draft.name,
    loopReward: draft.reward ?? "",
    twoMin: "",
    environment: "",
    schedule: "Daily",
    time: "Morning",
    contract: "",
    contractPartners: [],
    ...draft,
  });

  revalidateApp();
  return habit;
}

export async function updateHabitAction(habitId: string, patch: Partial<Habit>) {
  const userId = await requireUserId();
  log.info("Updating habit", { event: "habit.updated", userId: redactUserId(userId), habitId });
  // Stack validation (cycle, exclusivity, self-reference) lives in the
  // repository so that this server action and the /api/v1 PATCH route share
  // exactly the same rules. Errors bubble up as `StackError` with a
  // user-friendly message.
  const habit = await updateHabit(userId, habitId, patch);

  revalidateApp();
  return habit;
}

/**
 * Apply an atomic stack mutation (insert or remove). All affected habits are
 * updated inside a single database transaction; cycles and multi-stack
 * membership are rejected with a `StackError` whose message is safe to show
 * directly in a UI dialog.
 */
export async function applyStackMutationAction(input: StackMutationInput) {
  const userId = await requireUserId();
  log.info("Applying stack mutation", { event: "habit.stack_mutated", userId: redactUserId(userId), kind: input.kind });
  const affected = await applyStackMutation(userId, input);

  revalidateApp();
  return affected;
}

export async function deleteHabitAction(habitId: string) {
  const userId = await requireUserId();
  log.info("Deleting habit", { event: "habit.deleted", userId: redactUserId(userId), habitId });
  const habit = await archiveHabit(userId, habitId);

  revalidateApp();
  return habit;
}

export async function toggleHabitAction(habitId: string, dateKey: string, shouldComplete: boolean) {
  const userId = await requireUserId();
  log.info("Toggling habit check-in", { event: "habit.checked_in", userId: redactUserId(userId), habitId, dateKey, done: shouldComplete });
  const habit = await upsertCheckIn(userId, habitId, { dateKey, done: shouldComplete });

  revalidateApp();
  return habit;
}

export async function logCheckInAction(habitId: string, dateKey: string, payload: Partial<CheckIn>) {
  const userId = await requireUserId();
  log.info("Logging check-in details", { event: "habit.checkin_logged", userId: redactUserId(userId), habitId, dateKey });
  const hasMood = Object.prototype.hasOwnProperty.call(payload, "mood");
  const hasJournal = Object.prototype.hasOwnProperty.call(payload, "journal");
  const habit = await upsertCheckIn(userId, habitId, {
    dateKey,
    done: payload.done ?? true,
    ...(hasMood ? { mood: payload.mood ?? null } : {}),
    ...(hasJournal ? { journal: payload.journal ?? null } : {}),
  });

  revalidateApp();
  return habit;
}

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

export async function saveFormationVerdictAction(verdict: FormationVerdict) {
  const userId = await requireUserId();
  log.info("Saving formation verdict", { event: "formation.verdict_saved", userId: redactUserId(userId) });
  const saved = await saveFormationVerdictRecord(userId, verdict);

  revalidatePath("/hall-of-fame");
  return saved;
}

export async function savePreferencesAction(preferences: Partial<UserPreferences> & { lessonMode?: LessonMode }) {
  const userId = await requireUserId();
  log.info("Saving preferences", { event: "preferences.saved", userId: redactUserId(userId) });
  const saved = await savePreferences(userId, preferences);

  revalidatePath("/settings");
  revalidatePath("/lessons");
  return saved;
}
