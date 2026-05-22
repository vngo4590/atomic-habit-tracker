import type { Habit } from "@/lib/types";

export type StackPatch = { id: string; patch: Partial<Habit> };

/**
 * Get the root habit of a stack chain — the habit with no predecessor.
 *
 * Defensive: uses a visited-set so corrupted/cyclic data never causes infinite
 * recursion. In a cycle, the first habit reached from the input is returned.
 */
export function getStackRoot(habit: Habit, habits: Habit[]): Habit {
  let current: Habit = habit;
  const visited = new Set<string>([current.id]);

  while (true) {
    const predecessor = habits.find((h) => h.stackNextId === current.id);
    if (!predecessor || visited.has(predecessor.id)) {
      return current;
    }
    visited.add(predecessor.id);
    current = predecessor;
  }
}

/**
 * Get the ordered array of habits in the chain from root to tail. Always
 * cycle-safe via a visited set.
 */
export function getStackChain(habit: Habit, habits: Habit[]): Habit[] {
  const root = getStackRoot(habit, habits);
  return getChainFrom(root, habits);
}

/**
 * Walk forward from `habit` to the tail and return the resulting sub-chain.
 * The returned chain always starts with `habit` (when found in `habits`).
 * Cycle-safe via a visited set.
 */
export function getChainFrom(habit: Habit, habits: Habit[]): Habit[] {
  const chain: Habit[] = [];
  const visited = new Set<string>();
  const map = new Map(habits.map((h) => [h.id, h]));
  let current: Habit | undefined = map.get(habit.id) ?? habit;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    chain.push(current);
    current = current.stackNextId ? map.get(current.stackNextId) : undefined;
  }

  return chain;
}

/**
 * Get the immediate successor of a habit, or null.
 */
export function getSuccessor(habit: Habit, habits: Habit[]): Habit | null {
  return habits.find((h) => h.id === habit.stackNextId) ?? null;
}

/**
 * Get the immediate predecessor of a habit, or null.
 */
export function getPredecessor(habit: Habit, habits: Habit[]): Habit | null {
  return habits.find((h) => h.stackNextId === habit.id) ?? null;
}

/**
 * Returns true if `habit` participates in any stack — either it has a
 * successor (`stackNextId !== null`) or it is referenced by another habit's
 * `stackNextId`.
 */
export function isInStack(habit: Habit, habits: Habit[]): boolean {
  if (habit.stackNextId) return true;
  return habits.some((h) => h.id !== habit.id && h.stackNextId === habit.id);
}

/**
 * Check whether linking sourceId → targetId would create a cycle. That is,
 * after the link, walking forward from `source` would eventually reach
 * `source` again.
 */
export function wouldCreateCycle(sourceId: string, targetId: string, habits: Habit[]): boolean {
  if (sourceId === targetId) return true;
  const map = new Map(habits.map((h) => [h.id, h]));
  const visited = new Set<string>();
  let cursor: string | null = targetId;

  while (cursor) {
    if (visited.has(cursor)) break;
    visited.add(cursor);
    if (cursor === sourceId) return true;
    cursor = map.get(cursor)?.stackNextId ?? null;
  }

  return false;
}

/**
 * Returns an ordered list of `{ id, patch }` updates that safely inserts
 * `habitId` before or after `targetId` in the stack chain. The order matters:
 * because `stackNextId` is `@unique` at the database layer, patches must be
 * applied in the returned order to never have two habits pointing at the same
 * successor at the same instant.
 *
 * Semantics:
 *   - "before": predecessor (if any) → habitId → targetId.
 *   - "after":  targetId → habitId → targetNext (if any).
 *
 * Pre-condition: `habitId` is currently solo (no stackNextId, not referenced).
 * `applyStackMutationAction` is responsible for ensuring this; callers should
 * not bypass it.
 */
export function stackInsertPatches(
  habitId: string,
  position: "before" | "after",
  targetId: string,
  habits: Habit[],
): StackPatch[] {
  const target = habits.find((h) => h.id === targetId);
  if (!target) return [];

  const patches: StackPatch[] = [];

  if (position === "before") {
    const predecessor = habits.find((h) => h.stackNextId === targetId);
    if (predecessor) {
      // Step 1: free the predecessor's pointer (predecessor → habitId).
      patches.push({ id: predecessor.id, patch: { stackNextId: habitId } });
    }
    // Step 2: link habit → target.
    patches.push({ id: habitId, patch: { stackNextId: targetId } });
  } else {
    const targetNext = target.stackNextId;
    // Step 1: free the target's pointer (target → habitId). This unblocks
    // habit → targetNext below, since targetNext is no longer referenced by
    // target.
    patches.push({ id: targetId, patch: { stackNextId: habitId } });
    if (targetNext) {
      patches.push({ id: habitId, patch: { stackNextId: targetNext } });
    }
  }

  return patches;
}

/**
 * Returns an ordered list of `{ id, patch }` updates that safely removes a
 * habit from its stack chain and re-links its neighbors. The habit being
 * removed is always nulled BEFORE the predecessor is rewired, so the
 * `@unique` constraint on `stackNextId` is never violated.
 *
 * Order:
 *   1. removedHabit.stackNextId = null
 *   2. predecessor.stackNextId  = (former successor) | null
 */
export function stackRemovePatches(habitId: string, habits: Habit[]): StackPatch[] {
  const habit = habits.find((h) => h.id === habitId);
  if (!habit) return [];

  const patches: StackPatch[] = [];
  const predecessor = habits.find((h) => h.stackNextId === habitId);
  const successorId = habit.stackNextId ?? null;

  // Step 1: free the removed habit's pointer first so the successor is no
  // longer referenced by it. This must happen before the predecessor is
  // rewired to the successor (or the unique constraint would be violated
  // mid-transaction).
  if (successorId) {
    patches.push({ id: habitId, patch: { stackNextId: null } });
  } else if (predecessor) {
    // Tail removal — still null the habit for symmetry, but no successor.
    patches.push({ id: habitId, patch: { stackNextId: null } });
  } else {
    // Solo habit — nothing to patch.
    return [];
  }

  if (predecessor) {
    patches.push({ id: predecessor.id, patch: { stackNextId: successorId } });
  }

  return patches;
}

/**
 * Returns an ordered list of `{ id, patch }` updates that safely reorders a
 * stack chain into the exact sequence in `habitIds`. The order matters:
 * because `stackNextId` is `@unique` at the database layer, we first null
 * every listed habit's pointer, then write the new links.
 *
 * Pre-condition: the caller (server) has already verified that `habitIds`
 * is exactly the set of habits in the chain (no merges/splits via reorder).
 * No outside habit (active or archived) may point into the chain — this is
 * always true for a closed chain by construction.
 */
export function stackReorderPatches(habitIds: string[]): StackPatch[] {
  const patches: StackPatch[] = [];

  // Phase 1: null every chain member's pointer so the unique constraint has
  // no chance of firing as we rewire.
  for (const id of habitIds) {
    patches.push({ id, patch: { stackNextId: null } });
  }

  // Phase 2: link each habit to the next one in the new order. The tail
  // remains null (terminating the chain).
  for (let i = 0; i < habitIds.length - 1; i += 1) {
    patches.push({ id: habitIds[i], patch: { stackNextId: habitIds[i + 1] } });
  }

  return patches;
}

/**
 * For the Today page: return the first undone habit in each stack chain.
 * Returns one entry per chain that has at least one undone habit on the
 * given date.
 */
export function getVisibleStackHabit(habits: Habit[], dateKey: string): Habit[] {
  const roots = new Map<string, Habit>();

  for (const habit of habits) {
    const root = getStackRoot(habit, habits);
    roots.set(root.id, root);
  }

  const visible: Habit[] = [];
  for (const root of roots.values()) {
    const chain = getStackChain(root, habits);
    const firstUndone = chain.find((h) => !h.history[dateKey]);
    if (firstUndone) {
      visible.push(firstUndone);
    }
  }

  return visible;
}

/**
 * Group habits by their root stack id. Solo habits are grouped under their
 * own id. Within each group, habits are returned in chain order
 * (root → tail) for stable rendering.
 */
export function groupHabitsByStack(habits: Habit[]): Map<string, Habit[]> {
  const groups = new Map<string, Habit[]>();
  const visitedRoots = new Set<string>();

  for (const habit of habits) {
    const root = getStackRoot(habit, habits);
    if (visitedRoots.has(root.id)) continue;
    visitedRoots.add(root.id);
    groups.set(
      root.id,
      getChainFrom(root, habits).filter((h) => habits.some((candidate) => candidate.id === h.id)),
    );
  }

  return groups;
}
