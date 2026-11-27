/**
 * Fill in defaults for a habit draft so the client store can show an
 * optimistic habit row before the server has created the real one.
 * Pure function: no React or database code.
 */

import type { Habit, HabitDraft } from "@/lib/types";

export function normalizeDraft(draft: HabitDraft): Omit<Habit, "id" | "history" | "notes" | "createdAt"> {
  return {
    name: draft.name,
    emoji: draft.emoji ?? "•",
    cue: draft.cue ?? "",
    craving: draft.craving ?? "",
    response: draft.response ?? "",
    reward: draft.reward ?? "",
    loopCue: draft.loopCue ?? draft.cue ?? "",
    loopCraving: draft.loopCraving ?? draft.craving ?? "",
    loopResponse: draft.loopResponse ?? draft.response ?? "",
    loopReward: draft.loopReward ?? draft.reward ?? "",
    twoMin: draft.twoMin ?? "",
    identity: draft.identity,
    environment: draft.environment ?? "",
    schedule: draft.schedule ?? "Daily",
    time: draft.time ?? "Morning",
    stackNextId: draft.stackNextId ?? null,
    contract: draft.contract ?? "",
    contractPartners: draft.contractPartners ?? [],
  };
}
