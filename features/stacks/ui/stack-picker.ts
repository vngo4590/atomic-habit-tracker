/**
 * stack-picker — pure helpers behind the "Link before/after" picker on the
 * habit detail Stack tab. Kept free of React so the picker rules can be read
 * (and tested) in one place.
 */

import type { Habit } from "@/lib/types";

import { isInStack } from "../model/stack";

/**
 * Maximum number of habits the picker shows by default. When the filtered
 * list exceeds this cap the user can narrow it with search or expand it to
 * see every option. Exported so tests can reference the same constant.
 */
export const STACK_PICKER_DEFAULT_LIMIT = 10;

/**
 * Which habits the picker may offer, given the current habit.
 *
 * The rule is symmetric:
 *   - current habit is in a chain → only *standalone* habits can be inserted;
 *   - current habit is standalone → every other habit is a valid anchor
 *     (picking a chain member makes the current habit join that chain).
 *
 * `query` filters by name, identity or cue (case-insensitive).
 */
export function pickableHabits(habit: Habit, habits: Habit[], query: string): Habit[] {
  const currentIsSolo = !isInStack(habit, habits);
  const trimmed = query.trim().toLowerCase();
  return habits
    .filter((candidate) => {
      if (candidate.id === habit.id) return false;
      if (currentIsSolo) return true;
      return !isInStack(candidate, habits);
    })
    .filter((candidate) => {
      if (!trimmed) return true;
      const haystack = `${candidate.name} ${candidate.identity} ${candidate.cue}`.toLowerCase();
      return haystack.includes(trimmed);
    });
}

/**
 * Build the insert mutation for a picked habit. The server requires the
 * *inserted* habit to be standalone, so:
 *   - picked is in a chain → the current (solo) habit joins the picked chain;
 *   - picked is solo → the picked habit is inserted next to the current one.
 */
export function insertMutationFor(
  habit: Habit,
  pickedId: string,
  habits: Habit[],
  position: "before" | "after",
) {
  const picked = habits.find((candidate) => candidate.id === pickedId);
  const pickedIsInChain = picked ? isInStack(picked, habits) : false;
  return pickedIsInChain
    ? { kind: "insert" as const, habitId: habit.id, position, targetId: pickedId }
    : { kind: "insert" as const, habitId: pickedId, position, targetId: habit.id };
}

/** Friendly message for an empty picker, depending on why it is empty. */
export function emptyPickerMessage(query: string, currentIsSolo: boolean): string {
  if (query.trim()) return "No habits match your search.";
  return currentIsSolo
    ? "No other habits exist yet. Create another habit to start a stack."
    : "No standalone habits available. Remove a habit from its stack to make it selectable.";
}
