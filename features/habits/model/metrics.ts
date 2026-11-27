/**
 * Habit metrics — the numbers shown next to every habit: the current streak,
 * the best streak ever, and the completion rate over the last N days.
 *
 * All three respect the habit's schedule: a day the habit was not scheduled
 * neither helps nor breaks a streak, and the completion-rate denominator only
 * counts scheduled days. Pure functions with no React or database code.
 */

import { dateAdd, todayKey } from "@/lib/helpers";
import type { Habit } from "@/lib/types";

import { isScheduledForDate } from "./schedule";

/**
 * A history entry counts as "done" when the day was completed: `true` for
 * legacy boolean entries, or `done: true` for structured check-ins (an
 * unchecked day can still keep a mood or journal note).
 */
export function isDone(value: Habit["history"][string] | undefined) {
  return typeof value === "object" && value !== null ? value.done : Boolean(value);
}

/**
 * Current active streak — counts consecutive completed days walking backward
 * from today. Missing an unscheduled day does not break the streak, but
 * missing a scheduled day does. This preserves the old "anchor to yesterday"
 * behavior for daily habits while respecting custom schedules.
 */
export function streak(habit: Habit) {
  let count = 0;
  let date = todayKey();
  let seenAnchor = false;

  for (let i = 0; i < 365; i++) {
    const done = isDone(habit.history[date]);
    const scheduled = isScheduledForDate(date, habit.schedule);

    if (done) {
      count++;
      seenAnchor = true;
    } else if (scheduled) {
      if (seenAnchor) break;
      // Today (or the first day we hit) is scheduled and missed — step back
      // once, matching the old "anchor to yesterday" behavior, then continue.
      seenAnchor = true;
    } else {
      // Unscheduled day — neither helps nor hurts the streak
    }

    date = dateAdd(date, -1);
  }

  return count;
}

/**
 * Best streak ever — looks at consecutive done dates. If the gap between two
 * done dates consists only of unscheduled days, the streak continues across
 * the gap. A scheduled missed day breaks the streak.
 */
export function longestStreak(habit: Habit) {
  const keys = Object.keys(habit.history).filter((key) => isDone(habit.history[key])).sort();
  if (keys.length === 0) {
    return 0;
  }

  let best = 1;
  let current = 1;

  for (let i = 1; i < keys.length; i++) {
    const prev = keys[i - 1];
    const curr = keys[i];

    // Determine whether every calendar day between the two done dates is
    // unscheduled. If so, the streak continues; otherwise it resets.
    let gapIsAllUnscheduled = true;
    for (let date = dateAdd(prev, 1); date < curr; date = dateAdd(date, 1)) {
      if (isScheduledForDate(date, habit.schedule)) {
        gapIsAllUnscheduled = false;
        break;
      }
    }

    if (gapIsAllUnscheduled) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

/**
 * Adherence rate over the last N days. For habits with a structured schedule
 * (e.g. Mon, Wed) the denominator is the number of scheduled days in the
 * window, not the total number of calendar days. Bonus completions on
 * unscheduled days can push the result above 1.0.
 */
export function completionRate(habit: Habit, days = 30) {
  let done = 0;
  let scheduled = 0;

  for (let i = 0; i < days; i++) {
    const date = dateAdd(todayKey(), -i);
    if (isDone(habit.history[date])) {
      done++;
    }
    if (isScheduledForDate(date, habit.schedule)) {
      scheduled++;
    }
  }

  if (scheduled === 0) {
    // Free-text schedules are treated as always scheduled — fall back to
    // the original calendar-day denominator so we never divide by zero.
    return done / days;
  }

  return done / scheduled;
}
