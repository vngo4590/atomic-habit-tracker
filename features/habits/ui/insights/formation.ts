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
  /** Younger than FORMATION_DAYS and not yet reviewed. */
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
  const reviewed = new Set(verdicts.map((verdict) => verdict.habitId));
  const pending = habits.filter((habit) => !reviewed.has(habit.id));
  const byId = new Map(habits.map((habit) => [habit.id, habit]));
  return {
    ready: pending.filter((habit) => daysSince(habit.createdAt, today) >= FORMATION_DAYS),
    inProgress: pending
      .filter((habit) => daysSince(habit.createdAt, today) < FORMATION_DAYS)
      .sort((a, b) => daysSince(b.createdAt, today) - daysSince(a.createdAt, today)),
    inducted: verdicts.flatMap((verdict) => {
      const habit = byId.get(verdict.habitId);
      return verdict.formed && habit ? [{ habit, verdict }] : [];
    }),
  };
}
