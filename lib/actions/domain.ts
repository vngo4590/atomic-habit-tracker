"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  createHabit,
  archiveHabit,
  getHabit,
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

  if (patch.stackNextId !== undefined) {
    if (patch.stackNextId === habitId) {
      throw new Error("A habit cannot stack with itself.");
    }
    if (patch.stackNextId) {
      const target = await getHabit(userId, patch.stackNextId);
      if (!target) {
        throw new Error("Target habit not found.");
      }
      // Exclusivity: a habit can only be the next step for one other habit
      const currentOwner = await db.habit.findFirst({
        where: { userId, stackNextId: patch.stackNextId, NOT: { id: habitId } },
        select: { id: true },
      });
      if (currentOwner) {
        throw new Error("Target habit is already part of another stack.");
      }
      // Cycle detection: walk forward from target to see if we reach habitId
      let cursor: string | null = patch.stackNextId;
      const visited = new Set<string>();
      while (cursor) {
        if (visited.has(cursor)) break;
        visited.add(cursor);
        if (cursor === habitId) {
          throw new Error("This would create a circular stack.");
        }
        const nextHabit: { stackNextId: string | null } | null = await db.habit.findUnique({
          where: { id: cursor },
          select: { stackNextId: true },
        });
        cursor = nextHabit?.stackNextId ?? null;
      }
    }
  }

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

export async function updateJournalEntryAction(entryId: string, patch: Partial<JournalEntry>) {
  const userId = await requireUserId();
  const journalEntry = await updateJournalEntry(userId, entryId, {
    ...(patch.date ? { dateKey: patch.date } : {}),
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
