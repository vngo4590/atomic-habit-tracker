"use client";

import { useMemo, useSyncExternalStore } from "react";

import type { Habit } from "@/lib/types";

import { isScheduledForDate } from "../../model/schedule";
import {
  buildTodayItems,
  greetingFor,
  nextScheduledHabit,
  recentDays,
  votesByIdentity,
} from "./today-model";

/**
 * useTodayData — every number and list the Today screen renders, derived
 * once per store change from the habit list.
 *
 * The main list keeps the long-standing rule: only habits scheduled today
 * that are not yet done. Finished ones move to `doneToday` so the view can
 * show them in a collapsible "Completed" list with undo.
 */
export function useTodayData(habits: Habit[], streak: (habit: Habit) => number, today: string) {
  return useMemo(() => {
    const scheduledToday = habits.filter((habit) => isScheduledForDate(today, habit.schedule));
    const scheduledUndone = scheduledToday.filter((habit) => !habit.history[today]);
    const doneToday = scheduledToday.filter((habit) => habit.history[today]);

    // Longest active streak and the habit holding it (first wins on ties).
    let topHabit: Habit | null = null;
    let longest = 0;
    for (const habit of habits) {
      const value = streak(habit);
      if (topHabit === null || value > longest) {
        topHabit = habit;
        longest = Math.max(0, value);
      }
    }

    return {
      scheduledToday,
      scheduledUndone,
      doneToday,
      items: buildTodayItems(scheduledUndone, habits, today),
      last14: recentDays(habits, today, 14),
      votes: votesByIdentity(habits, today),
      longest,
      topHabit,
      nextUp: scheduledToday.length === 0 ? nextScheduledHabit(habits, today) : null,
    };
  }, [habits, streak, today]);
}

// The clock never "changes" from React's point of view; the greeting is
// recomputed on each render, which is often enough for a time-of-day label.
const noopSubscribe = () => () => {};

/**
 * useGreeting — "Good morning" etc. from the *browser's* clock. The server
 * snapshot is a neutral "Hello" so server HTML and hydration always match,
 * whatever timezone the server runs in.
 */
export function useGreeting(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => greetingFor(new Date().getHours()),
    () => "Hello",
  );
}
