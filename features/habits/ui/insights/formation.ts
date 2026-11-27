import { todayKey } from "@/lib/helpers";
import type { FormationVerdict, Habit } from "@/lib/types";

/** A habit is reviewed for formation after 66 days (Lally et al.'s median). */
export const FORMATION_DAYS = 66;

/** Whole days between a habit's createdAt date and today (never negative). */
export function daysSince(dateKey: string, today: string = todayKey()): number {
  const start = new Date(`${dateKey.slice(0, 10)}T00:00:00`);
  const end = new Date(`${today}T00:00:00`);
  // Round, not floor: a DST change makes some local-midnight spans 23/25 h.
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
}

export interface FormationGroups {
  /** Old enough for review and not yet reviewed. */
  ready: Habit[];
  /** Younger than FORMATION_DAYS and not yet reviewed, or reviewed as "keep practicing". */
  inProgress: Habit[];
  /** Habits whose verdict says the habit is formed. */
  inducted: Array<{ habit: Habit; verdict: FormationVerdict }>;
}

/** Split habits into the three Hall of Fame groups. */
export function groupForFormation(
  habits: Habit[],
  verdicts: FormationVerdict[],
  today: string = todayKey(),
): FormationGroups {
  const verdictOf = new Map(verdicts.map((verdict) => [verdict.habitId, verdict]));
  const byId = new Map(habits.map((habit) => [habit.id, habit]));
  // A "keep practicing" verdict keeps the habit in progress rather than hiding it.
  const isReady = (habit: Habit) =>
    !verdictOf.has(habit.id) && daysSince(habit.createdAt, today) >= FORMATION_DAYS;
  return {
    ready: habits.filter(isReady),
    inProgress: habits
      .filter((habit) => !verdictOf.get(habit.id)?.formed && !isReady(habit))
      .sort((a, b) => daysSince(b.createdAt, today) - daysSince(a.createdAt, today)),
    inducted: verdicts.flatMap((verdict) => {
      const habit = byId.get(verdict.habitId);
      return verdict.formed && habit ? [{ habit, verdict }] : [];
    }),
  };
}
