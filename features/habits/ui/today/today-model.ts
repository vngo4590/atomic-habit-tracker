/**
 * today-model — pure derivations behind the Today screen.
 *
 * Nothing here touches React or the store, so every rule (which habits show,
 * how chains collapse, what the sparkline plots) can be unit-tested with plain
 * fixtures. `useTodayData` wires these into the view.
 */
import { getChainFrom, getStackRoot, isInStack } from "@/features/stacks";
import { dateAdd } from "@/lib/helpers";
import type { Habit } from "@/lib/types";

import { isScheduledForDate, nextScheduledDateKey } from "../../model/schedule";

/** One entry in the focus list: a lone habit, or the visible top of a chain. */
export type TodayItem =
  | { kind: "solo"; habit: Habit }
  | { kind: "stack"; rootId: string; visible: Habit };

/**
 * Build today's focus list from the scheduled-but-undone habits.
 *
 * Each chain renders exactly once, headed by its first undone link that is
 * scheduled today (falling back to any undone link, then the root), so the
 * card group can walk forward from there. Habits outside any chain render as
 * single rows.
 */
export function buildTodayItems(scheduledUndone: Habit[], habits: Habit[], today: string): TodayItem[] {
  const seenChains = new Set<string>();
  const items: TodayItem[] = [];
  for (const habit of scheduledUndone) {
    if (!isInStack(habit, habits)) {
      items.push({ kind: "solo", habit });
      continue;
    }
    const root = getStackRoot(habit, habits);
    if (seenChains.has(root.id)) continue;
    seenChains.add(root.id);
    const fullChain = getChainFrom(root, habits);
    const firstVisible =
      fullChain.find((h) => isScheduledForDate(today, h.schedule) && !h.history[today]) ??
      fullChain.find((h) => !h.history[today]) ??
      fullChain[0];
    if (firstVisible) items.push({ kind: "stack", rootId: root.id, visible: firstVisible });
  }
  return items;
}

/** One sparkline column: how many scheduled habits were done on `key`. */
export interface DayTally {
  key: string;
  done: number;
  total: number;
}

/** Per-day completion for the last `days` days, oldest first, ending today. */
export function recentDays(habits: Habit[], today: string, days = 14): DayTally[] {
  const out: DayTally[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dateAdd(today, -i);
    const scheduled = habits.filter((habit) => isScheduledForDate(key, habit.schedule));
    out.push({ key, done: scheduled.filter((habit) => habit.history[key]).length, total: scheduled.length });
  }
  return out;
}

/**
 * Today's identity votes: completed habits that were scheduled today, tallied
 * by the identity they reinforce ("I am a reader" +2).
 */
export function votesByIdentity(habits: Habit[], today: string): Array<[string, number]> {
  const tally = new Map<string, number>();
  for (const habit of habits) {
    if (habit.history[today] && isScheduledForDate(today, habit.schedule)) {
      tally.set(habit.identity, (tally.get(habit.identity) ?? 0) + 1);
    }
  }
  return Array.from(tally.entries());
}

/**
 * The soonest upcoming habit after `today` (used by the rest-day state).
 * Habits with free-text schedules have no computable next day and are skipped.
 */
export function nextScheduledHabit(habits: Habit[], today: string): { habit: Habit; dateKey: string } | null {
  let best: { habit: Habit; dateKey: string } | null = null;
  for (const habit of habits) {
    const dateKey = nextScheduledDateKey(today, habit.schedule);
    if (dateKey && (!best || dateKey < best.dateKey)) best = { habit, dateKey };
  }
  return best;
}

/** Time-of-day greeting for the header. */
export function greetingFor(hour: number): string {
  if (hour < 5) return "Late night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Case-insensitive search across name, identity and cue. Empty query = []. */
export function searchHabits(habits: Habit[], query: string): Habit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return habits.filter(
    (habit) =>
      habit.name.toLowerCase().includes(q) ||
      habit.identity.toLowerCase().includes(q) ||
      habit.cue.toLowerCase().includes(q),
  );
}
