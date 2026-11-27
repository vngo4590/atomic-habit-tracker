import "server-only";

/**
 * Habit mapper — converts a habit row loaded from the database (with its
 * check-ins, notes and contract) into the `Habit` object the rest of the app
 * uses. Shared by every repository that returns habits, including the stacks
 * feature, so a habit always looks the same no matter which query loaded it.
 */

import { utcDateToDateKey as toDateKey } from "@/lib/date-keys";
import type { Habit } from "@/lib/types";

export type HabitRecord = {
  id: string;
  name: string;
  emoji: string;
  cue: string;
  craving: string;
  response: string;
  reward: string;
  loopCue: string;
  loopCraving: string;
  loopResponse: string;
  loopReward: string;
  twoMin: string;
  identity: string;
  environment: string;
  schedule: string;
  time: string;
  createdAt: Date;
  checkIns?: Array<{
    dateKey: string;
    done: boolean;
    mood: number | null;
    journal: string | null;
  }>;
  notes?: Array<{ id: string; body: string; createdAt: Date }>;
  contract?: { terms: string; partners: string[] } | null;
};

export const habitInclude = {
  checkIns: true,
  notes: { orderBy: { createdAt: "desc" as const } },
  contract: true,
};

export function toHabit(record: HabitRecord & { stackNextId?: string | null }): Habit {
  const checkIns = record.checkIns ?? [];
  const notes = record.notes ?? [];
  const contract = record.contract;
  const history: Habit["history"] = {};

  for (const checkIn of checkIns) {
    history[checkIn.dateKey] = {
      done: checkIn.done,
      ...(checkIn.mood ? { mood: checkIn.mood } : {}),
      ...(checkIn.journal ? { journal: checkIn.journal } : {}),
    };
  }

  return {
    id: record.id,
    name: record.name,
    emoji: record.emoji,
    cue: record.cue,
    craving: record.craving,
    response: record.response,
    reward: record.reward,
    loopCue: record.loopCue,
    loopCraving: record.loopCraving,
    loopResponse: record.loopResponse,
    loopReward: record.loopReward,
    twoMin: record.twoMin,
    identity: record.identity,
    environment: record.environment,
    schedule: record.schedule,
    time: record.time,
    stackNextId: record.stackNextId ?? null,
    contract: contract?.terms ?? "",
    contractPartners: contract?.partners ?? [],
    history,
    notes: notes.map((note) => ({
      id: note.id,
      body: note.body,
      createdAt: toDateKey(note.createdAt),
    })),
    createdAt: toDateKey(record.createdAt),
  };
}
