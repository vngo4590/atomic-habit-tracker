import { dateAdd, fmt } from "@/lib/helpers";
import type { Habit } from "@/lib/types";

import { isScheduledForDate } from "../../model/schedule";

/** Date ranges offered by the analytics range control (days). */
export const RANGES = [14, 30, 90] as const;
export type RangeDays = (typeof RANGES)[number];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
/** JS `getDay()` index for each entry of WEEKDAYS (Monday first). */
const WEEKDAY_INDEX = [1, 2, 3, 4, 5, 6, 0] as const;

/** A habit counts as "at risk" when it is below this 7-day completion rate. */
export const AT_RISK_THRESHOLD = 0.5;

export interface DayPoint {
  key: string;
  label: string;
  /** Completed / scheduled for that day, 0–100. 0 when nothing was scheduled. */
  pct: number;
  scheduled: number;
  done: number;
}

export interface WeekdayRate {
  label: (typeof WEEKDAYS)[number];
  pct: number;
  /** Scheduled habit-days that fell on this weekday within the range. */
  total: number;
}

/** The `days` date keys ending today, oldest first. */
export function rangeKeys(today: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => dateAdd(today, index - days + 1));
}

/**
 * One point per day: the share of habits scheduled that day which were
 * completed. Unscheduled habits never drag the average down.
 */
export function dailyCompletion(habits: Habit[], keys: string[]): DayPoint[] {
  return keys.map((key) => {
    const scheduled = habits.filter((habit) => isScheduledForDate(key, habit.schedule));
    const done = scheduled.filter((habit) => habit.history[key]).length;
    return {
      key,
      label: fmt.short(key),
      pct: scheduled.length ? Math.round((done / scheduled.length) * 100) : 0,
      scheduled: scheduled.length,
      done,
    };
  });
}

/** Completion bucketed by weekday (Monday first) across the given days. */
export function weekdayRates(habits: Habit[], keys: string[]): WeekdayRate[] {
  const totals = new Map<number, { total: number; done: number }>();
  for (const key of keys) {
    const weekday = new Date(`${key}T00:00:00`).getDay();
    const bucket = totals.get(weekday) ?? { total: 0, done: 0 };
    for (const habit of habits) {
      if (!isScheduledForDate(key, habit.schedule)) continue;
      bucket.total += 1;
      if (habit.history[key]) bucket.done += 1;
    }
    totals.set(weekday, bucket);
  }
  return WEEKDAYS.map((label, index) => {
    const bucket = totals.get(WEEKDAY_INDEX[index]) ?? { total: 0, done: 0 };
    return { label, total: bucket.total, pct: bucket.total ? Math.round((bucket.done / bucket.total) * 100) : 0 };
  });
}

/** All-time count of completed check-ins across habits. */
export function totalCheckIns(habits: Habit[]): number {
  return habits.reduce(
    (sum, habit) => sum + Object.keys(habit.history).filter((key) => Boolean(habit.history[key])).length,
    0,
  );
}

/** Scheduled vs completed habit-days in the range, summed over all days. */
export function rangeTotals(points: DayPoint[]): { done: number; scheduled: number; pct: number } {
  const done = points.reduce((sum, point) => sum + point.done, 0);
  const scheduled = points.reduce((sum, point) => sum + point.scheduled, 0);
  return { done, scheduled, pct: scheduled ? Math.round((done / scheduled) * 100) : 0 };
}
