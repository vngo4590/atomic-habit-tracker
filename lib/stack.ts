/**
 * Habit Stacking Logic
 *
 * Habits can be chained into a linear stack using stackAfterId:
 *   A -> B -> C means B.stackAfterId = A.id and C.stackAfterId = B.id
 *
 * Each habit has at most one predecessor (stackAfterId) and at most one
 * successor (the habit whose stackAfterId points to it). This keeps stacks
 * simple and linear — no branching, no cycles.
 */

import type { Habit } from "./types";

/**
 * Find the habit that comes immediately after the given habit in the stack.
 * Returns undefined if this habit is the last one in its chain.
 */
export function getSuccessor(habitId: string, habits: Habit[]): Habit | undefined {
  return habits.find((h) => h.stackAfterId === habitId);
}

/**
 * Find the habit that comes immediately before the given habit in the stack.
 * Returns undefined if this habit is the root/first of its chain.
 */
export function getPredecessor(habitId: string, habits: Habit[]): Habit | undefined {
  const habit = habits.find((h) => h.id === habitId);
  if (!habit || !habit.stackAfterId) return undefined;
  return habits.find((h) => h.id === habit.stackAfterId);
}

/**
 * Walk backward from a habit until we reach the root (the habit with no
 * predecessor). This is the first habit that should be shown/done in the
 * stack.
 */
export function getStackRoot(habitId: string, habits: Habit[]): Habit | undefined {
  const visited = new Set<string>();
  let current = habits.find((h) => h.id === habitId);

  while (current && current.stackAfterId) {
    if (visited.has(current.id)) {
      // Cycle detected — break to avoid infinite loop
      return undefined;
    }
    visited.add(current.id);
    current = habits.find((h) => h.id === current!.stackAfterId);
  }

  return current;
}

/**
 * Build the full stack chain from root to tail, starting from any habit
 * in the chain. Returns an ordered array of habit IDs.
 */
export function getStackChain(habitId: string, habits: Habit[]): string[] {
  const root = getStackRoot(habitId, habits);
  if (!root) return [];

  const chain: string[] = [];
  const visited = new Set<string>();
  let current: Habit | undefined = root;

  while (current) {
    if (visited.has(current.id)) {
      // Cycle detected — break to avoid infinite loop
      break;
    }
    visited.add(current.id);
    chain.push(current.id);
    current = getSuccessor(current.id, habits);
  }

  return chain;
}

/**
 * Build the full stack chain from root to tail as an array of Habit objects.
 */
export function getStackHabits(habitId: string, habits: Habit[]): Habit[] {
  const chainIds = getStackChain(habitId, habits);
  return chainIds
    .map((id) => habits.find((h) => h.id === id))
    .filter((h): h is Habit => h !== undefined);
}

/**
 * Check whether setting `habitId.stackAfterId = targetId` would create a
 * circular dependency. We follow the chain starting from targetId; if we
 * ever reach habitId, the new link would close a loop.
 */
export function wouldCreateCycle(habitId: string, targetId: string | null, habits: Habit[]): boolean {
  if (!targetId || habitId === targetId) return true;

  const visited = new Set<string>();
  let current = targetId;

  while (current) {
    if (visited.has(current)) {
      // Existing cycle — treat as unsafe
      return true;
    }
    visited.add(current);

    const habit = habits.find((h) => h.id === current);
    if (!habit || !habit.stackAfterId) break;
    if (habit.stackAfterId === habitId) return true;
    current = habit.stackAfterId;
  }

  return false;
}

/**
 * Compute the patch objects needed to insert a habit into a stack.
 *
 * Position "before" target: the habit will come immediately before target.
 *   Example: A -> B -> C, insert D before C  =>  A -> B -> D -> C
 *
 * Position "after" target: the habit will come immediately after target.
 *   Example: A -> B -> C, insert D after B   =>  A -> B -> D -> C
 *
 * Returns a map of habitId -> patch. The caller is responsible for applying
 * each patch through updateHabit().
 */
export function stackInsertPatches(
  habitId: string,
  targetId: string,
  position: "before" | "after",
  habits: Habit[],
): Map<string, Partial<Habit>> {
  const patches = new Map<string, Partial<Habit>>();
  const habit = habits.find((h) => h.id === habitId);
  const target = habits.find((h) => h.id === targetId);

  if (!habit || !target) return patches;

  // Safety: inserting before/after yourself is a no-op
  if (habitId === targetId) return patches;

  if (position === "before") {
    // H takes target's former predecessor; target now comes after H
    patches.set(habitId, { stackAfterId: target.stackAfterId });
    patches.set(targetId, { stackAfterId: habitId });
  } else {
    // H comes after target
    const oldSuccessor = getSuccessor(targetId, habits);
    patches.set(habitId, { stackAfterId: targetId });

    if (oldSuccessor && oldSuccessor.id !== habitId) {
      // Old successor now comes after H
      patches.set(oldSuccessor.id, { stackAfterId: habitId });
    }
  }

  return patches;
}

/**
 * Compute the patch objects needed to remove a habit from its stack.
 * The habit's successor (if any) is re-linked to the habit's predecessor.
 *
 * Returns a map of habitId -> patch.
 */
export function stackRemovePatches(habitId: string, habits: Habit[]): Map<string, Partial<Habit>> {
  const patches = new Map<string, Partial<Habit>>();
  const habit = habits.find((h) => h.id === habitId);
  if (!habit) return patches;

  const successor = getSuccessor(habitId, habits);
  if (successor) {
    // Bypass this habit: successor now points to this habit's predecessor
    patches.set(successor.id, { stackAfterId: habit.stackAfterId });
  }

  // Detach the habit itself
  patches.set(habitId, { stackAfterId: null });

  return patches;
}

/**
 * Determine which habit in a stack should be visible/active on the Today
 * page, assuming habits are revealed sequentially as predecessors are done.
 *
 * Starting from the root, we walk forward until we find the first habit
 * that is NOT done today. That habit (and only that habit) is shown.
 * If all habits in the stack are done, none are shown.
 */
export function getVisibleStackHabit(
  rootHabitId: string,
  habits: Habit[],
  todayKey: string,
): Habit | undefined {
  const chain = getStackHabits(rootHabitId, habits);

  for (const habit of chain) {
    const done = Boolean(habit.history[todayKey]);
    if (!done) {
      return habit;
    }
  }

  // All habits in this stack are done — nothing to show
  return undefined;
}

/**
 * Group habits by their stack roots. Each habit that is part of a stack is
 * grouped under its root habit's ID. Standalone habits (not in any stack)
 * are grouped under their own ID.
 *
 * Returns a Map where keys are root habit IDs and values are arrays of
 * habits in that stack (including the root), ordered from root to tail.
 */
export function groupHabitsByStack(habits: Habit[]): Map<string, Habit[]> {
  const groups = new Map<string, Habit[]>();
  const processed = new Set<string>();

  for (const habit of habits) {
    if (processed.has(habit.id)) continue;

    const root = getStackRoot(habit.id, habits);
    const rootId = root ? root.id : habit.id;
    const chain = getStackHabits(rootId, habits);

    for (const h of chain) {
      processed.add(h.id);
    }

    groups.set(rootId, chain);
  }

  return groups;
}
