import type { Habit } from "@/lib/types";

/**
 * Get the root habit of a stack chain — the habit with no predecessor.
 */
export function getStackRoot(habit: Habit, habits: Habit[]): Habit {
  const predecessor = habits.find((h) => h.stackNextId === habit.id);
  if (predecessor) {
    return getStackRoot(predecessor, habits);
  }
  return habit;
}

/**
 * Get the ordered array of habits in the chain from root to tail.
 */
export function getStackChain(habit: Habit, habits: Habit[]): Habit[] {
  const root = getStackRoot(habit, habits);
  const chain: Habit[] = [];
  const visited = new Set<string>();
  let current: Habit | undefined = root;

  while (current) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    chain.push(current);
    current = habits.find((h) => h.id === current?.stackNextId);
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
 * Check whether linking sourceId → targetId would create a cycle.
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
 * Return the minimal patch set to insert a habit before or after a target.
 */
export function stackInsertPatches(
  habitId: string,
  position: "before" | "after",
  targetId: string,
  habits: Habit[],
): Array<{ id: string; patch: Partial<Habit> }> {
  const patches: Array<{ id: string; patch: Partial<Habit> }> = [];
  const target = habits.find((h) => h.id === targetId);
  if (!target) return patches;

  const predecessor = habits.find((h) => h.stackNextId === targetId);

  if (position === "before") {
    // habit -> target, predecessor -> habit (if any)
    patches.push({ id: habitId, patch: { stackNextId: targetId } });
    if (predecessor) {
      patches.push({ id: predecessor.id, patch: { stackNextId: habitId } });
    }
  } else {
    // habit -> target's successor, target -> habit
    const targetNext = target.stackNextId;
    patches.push({ id: targetId, patch: { stackNextId: habitId } });
    patches.push({ id: habitId, patch: { stackNextId: targetNext } });
  }

  return patches;
}

/**
 * Return the minimal patch set to remove a habit and re-link its neighbors.
 */
export function stackRemovePatches(
  habitId: string,
  habits: Habit[],
): Array<{ id: string; patch: Partial<Habit> }> {
  const patches: Array<{ id: string; patch: Partial<Habit> }> = [];
  const habit = habits.find((h) => h.id === habitId);
  if (!habit) return patches;

  const predecessor = habits.find((h) => h.stackNextId === habitId);

  if (predecessor) {
    patches.push({ id: predecessor.id, patch: { stackNextId: habit.stackNextId } });
  }
  patches.push({ id: habitId, patch: { stackNextId: null } });

  return patches;
}

/**
 * For the Today page: return the first undone habit in each stack chain.
 * If the habit is not in a stack, returns the habit itself if undone.
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
 * Group habits by their root stack id. Solo habits are grouped under their own id.
 */
export function groupHabitsByStack(habits: Habit[]): Map<string, Habit[]> {
  const groups = new Map<string, Habit[]>();

  for (const habit of habits) {
    const root = getStackRoot(habit, habits);
    const list = groups.get(root.id) ?? [];
    list.push(habit);
    groups.set(root.id, list);
  }

  return groups;
}
