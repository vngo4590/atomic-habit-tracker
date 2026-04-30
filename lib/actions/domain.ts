"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/session";
import {
  createHabit,
  archiveHabit,
  updateHabit,
  upsertCheckIn,
} from "@/lib/repositories/habits";
import {
  createJournalEntry,
  markLessonComplete,
  saveFormationVerdict as saveFormationVerdictRecord,
  saveIdentity,
  savePreferences,
  saveWeeklyReview,
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

function revalidateApp() {
  revalidatePath("/");
  revalidatePath("/habits");
  revalidatePath("/journal");
  revalidatePath("/review");
  revalidatePath("/lessons");
  revalidatePath("/identity");
  revalidatePath("/hall-of-fame");
  revalidatePath("/settings");
}

export async function createHabitAction(draft: HabitDraft) {
  const userId = await requireUserId();
  const habit = await createHabit(userId, {
    emoji: "•",
    cue: "",
    craving: "",
    response: draft.name,
    reward: "",
    twoMin: "",
    stack: "",
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
  const habit = await updateHabit(userId, habitId, patch);

  revalidateApp();
  return habit;
}

export async function deleteHabitAction(habitId: string) {
  const userId = await requireUserId();
  const habit = await archiveHabit(userId, habitId);

  revalidateApp();
  return habit;
}

export async function toggleHabitAction(habitId: string, dateKey: string, shouldComplete: boolean) {
  const userId = await requireUserId();
  const habit = await upsertCheckIn(userId, habitId, { dateKey, done: shouldComplete });

  revalidateApp();
  return habit;
}

export async function logCheckInAction(habitId: string, dateKey: string, payload: Partial<CheckIn>) {
  const userId = await requireUserId();
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

export async function saveWeeklyReviewAction(weekStartKey: string, answers: WeeklyReviewAnswers) {
  const userId = await requireUserId();
  const review = await saveWeeklyReview(userId, { weekStartKey, ...answers });

  revalidatePath("/review");
  return review;
}

export async function saveIdentityAction(identity: Identity) {
  const userId = await requireUserId();
  const saved = await saveIdentity(userId, identity);

  revalidatePath("/");
  revalidatePath("/identity");
  revalidatePath("/habits/new");
  return saved;
}

export async function markLessonReadAction(lessonId: number) {
  const userId = await requireUserId();
  const completed = await markLessonComplete(userId, lessonId);

  revalidatePath("/lessons");
  return completed;
}

export async function saveFormationVerdictAction(verdict: FormationVerdict) {
  const userId = await requireUserId();
  const saved = await saveFormationVerdictRecord(userId, verdict);

  revalidatePath("/hall-of-fame");
  return saved;
}

export async function savePreferencesAction(preferences: Partial<UserPreferences> & { lessonMode?: LessonMode }) {
  const userId = await requireUserId();
  const saved = await savePreferences(userId, preferences);

  revalidatePath("/settings");
  revalidatePath("/lessons");
  return saved;
}
