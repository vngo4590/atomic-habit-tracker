import type { FormationVerdict, Habit } from "@/lib/types";

/**
 * The maximum number of *active* habits a single user may keep at once.
 *
 * Atomicly is deliberately about a *small* number of votes for who you want to
 * become, so we cap active habits rather than let the list sprawl. Three is the
 * ceiling.
 *
 * A habit counts as "active" when it is BOTH:
 *   1. not archived (`archivedAt == null`), and
 *   2. not inducted into the Hall of Fame — i.e. it has no `FormationVerdict`
 *      with `decision = formed`.
 *
 * Inducting a habit (it becomes "formed") frees a slot: the habit stays fully
 * trackable but no longer competes for one of the three active slots. Archiving
 * a habit likewise frees a slot.
 *
 * This module is the single shared definition of the cap so the server (which
 * counts in SQL) and the client (which counts in memory) can never drift.
 */
export const MAX_ACTIVE_HABITS = 3;

/**
 * True when the habit identified by `habitId` has been inducted into the Hall
 * of Fame — i.e. one of its formation verdicts is marked `formed`. Mirrors the
 * predicate the Hall of Fame page uses (`verdicts.filter(v => v.formed)`), so
 * the two views agree on what "inducted" means.
 */
export function isInductedHabit(habitId: string, verdicts: FormationVerdict[]): boolean {
  return verdicts.some((verdict) => verdict.habitId === habitId && verdict.formed);
}

/**
 * Count how many of the supplied habits are *active* (count against the cap).
 *
 * The client's `habits` list already excludes archived habits (it comes from
 * `listHabits`, which filters `archivedAt: null`), so the only exclusion left to
 * apply here is induction. The result is symmetric with the server-side
 * `countActiveHabits` Prisma query.
 */
export function activeHabitCount(habits: Habit[], verdicts: FormationVerdict[]): number {
  const inductedIds = new Set(
    verdicts.filter((verdict) => verdict.formed).map((verdict) => verdict.habitId),
  );
  return habits.filter((habit) => !inductedIds.has(habit.id)).length;
}

/**
 * How many more active habits the user may create right now (never negative).
 * Used to drive the new-habit page's cap banner and disabled-submit state.
 */
export function remainingHabitSlots(habits: Habit[], verdicts: FormationVerdict[]): number {
  return Math.max(0, MAX_ACTIVE_HABITS - activeHabitCount(habits, verdicts));
}
