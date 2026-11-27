/**
 * filter-habits — pure filter → search → sort pipeline behind the habits
 * library. No React, so the rules are easy to read and unit test.
 */

import type { Habit } from "@/lib/types";

import { nextScheduledDateKey } from "../../model/schedule";
import { isDone as isDayDone } from "../../model/metrics";

export type LibraryFilter = "all" | "done" | "upcoming";
export type LibrarySort = "streak" | "rate" | "newest" | "name";

export const LIBRARY_FILTERS: { value: LibraryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "done", label: "Done today" },
  { value: "upcoming", label: "Upcoming" },
];

export const LIBRARY_SORTS: { value: LibrarySort; label: string }[] = [
  { value: "streak", label: "Active streak" },
  { value: "rate", label: "30-day rate" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name" },
];

export interface LibraryQuery {
  filter: LibraryFilter;
  search: string;
  sort: LibrarySort;
  today: string;
  streak: (habit: Habit) => number;
  completionRate: (habit: Habit) => number;
}

/** True when the habit has been checked in on `today`. */
export function isDoneOn(habit: Habit, today: string): boolean {
  return isDayDone(habit.history[today]);
}

function matchesFilter(habit: Habit, filter: LibraryFilter, today: string): boolean {
  if (filter === "all") return true;
  if (filter === "done") return isDoneOn(habit, today);
  // Upcoming = the habit has another scheduled day ahead.
  return nextScheduledDateKey(today, habit.schedule) !== null;
}

function matchesSearch(habit: Habit, query: string): boolean {
  if (!query) return true;
  return (
    habit.name.toLowerCase().includes(query) ||
    habit.identity.toLowerCase().includes(query) ||
    habit.cue.toLowerCase().includes(query)
  );
}

/** Apply the library's filter, then search (name/identity/cue), then sort. */
export function filterHabits(habits: Habit[], query: LibraryQuery): Habit[] {
  const search = query.search.trim().toLowerCase();
  return habits
    .filter((habit) => matchesFilter(habit, query.filter, query.today) && matchesSearch(habit, search))
    .sort((a, b) => {
      if (query.sort === "streak") return query.streak(b) - query.streak(a);
      if (query.sort === "rate") return query.completionRate(b) - query.completionRate(a);
      if (query.sort === "newest") return b.createdAt.localeCompare(a.createdAt);
      return a.name.localeCompare(b.name);
    });
}
