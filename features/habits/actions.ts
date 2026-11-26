"use server";

/**
 * Habit server actions: the browser calls these to create, edit, archive and
 * check in habits, and to record a formation verdict. Each one checks who is
 * signed in, logs the event, writes through the habits repositories and then
 * refreshes the cached pages.
 */

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/session";
import { logger, redactUserId } from "@/lib/logger";
import { revalidateApp } from "@/lib/revalidate-app";
import type { CheckIn, FormationVerdict, Habit, HabitDraft } from "@/lib/types";

import {
  archiveHabit,
  createHabit,
  saveFormationVerdict as saveFormationVerdictRecord,
  updateHabit,
  upsertCheckIn,
  type CreateHabitResult,
} from "./server";

const log = logger.child({ module: "actions.domain" });

/**
 * Create a habit for the signed-in user. Returns the repository's discriminated
 * `CreateHabitResult` unchanged so the caller can tell a successful create from
 * a cap refusal — thrown error messages are stripped from server actions in
 * production, so a discriminated union is the only reliable way to surface the
 * "you've reached the 3-active-habit cap" reason to the browser.
 */
export async function createHabitAction(draft: HabitDraft): Promise<CreateHabitResult> {
  const userId = await requireUserId();
  log.info("Creating habit", { event: "habit.created", userId: redactUserId(userId), habitName: draft.name });
  const result = await createHabit(userId, {
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

  // Only revalidate cached pages when a habit was actually created; a cap
  // refusal changes nothing on the server.
  if (result.ok) {
    revalidateApp();
  }
  return result;
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

export async function saveFormationVerdictAction(verdict: FormationVerdict) {
  const userId = await requireUserId();
  log.info("Saving formation verdict", { event: "formation.verdict_saved", userId: redactUserId(userId) });
  const saved = await saveFormationVerdictRecord(userId, verdict);

  revalidatePath("/hall-of-fame");
  return saved;
}
