import { dateAdd, fmt, todayKey } from "./helpers";

const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const RECOGNIZED_SCHEDULES: Array<{ label: string; days: readonly string[] }> = [
  { label: "Daily", days: DAY_ORDER },
  { label: "Weekdays", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { label: "Weekends", days: ["Sun", "Sat"] },
  { label: "3x a week", days: ["Mon", "Wed", "Fri"] },
];

function normalizeScheduleDays(schedule: string) {
  const daySet = new Set(
    schedule
      .split(",")
      .map((day) => day.trim())
      .filter(Boolean),
  );

  return DAY_ORDER.filter((day) => daySet.has(day));
}

function sameDays(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((day, index) => day === right[index]);
}

function getDayAbbrev(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return DAY_ORDER[date.getDay()];
}

function parseScheduleDays(schedule: string): string[] | null {
  const trimmed = schedule.trim();

  if (trimmed === "Daily" || trimmed === "Every day") {
    return [...DAY_ORDER];
  }

  const recognized = RECOGNIZED_SCHEDULES.find((item) => item.label === trimmed);
  if (recognized) {
    return [...recognized.days];
  }

  const days = normalizeScheduleDays(trimmed);
  if (days.length > 0) {
    return days;
  }

  // Free text or empty — treat as always scheduled
  return null;
}

export function formatScheduleLabel(schedule: string) {
  const trimmed = schedule.trim();

  if (!trimmed) {
    return "Custom";
  }

  if (trimmed === "Every day") {
    return "Daily";
  }

  const days = normalizeScheduleDays(trimmed);
  if (days.length === 0) {
    return trimmed;
  }

  const recognized = RECOGNIZED_SCHEDULES.find((item) => sameDays(days, item.days));
  return recognized?.label ?? days.join(", ");
}

/**
 * Check whether a habit's schedule includes the given date.
 * Free-text schedules are treated as always scheduled.
 */
export function isScheduledForDate(dateKey: string, schedule: string): boolean {
  const days = parseScheduleDays(schedule);
  if (days === null) {
    return true;
  }
  return days.includes(getDayAbbrev(dateKey));
}

/**
 * Find the next scheduled date for a habit after the given date.
 * Searches up to 14 days ahead. Returns null for free-text schedules.
 */
export function nextScheduledDateKey(fromDateKey: string, schedule: string): string | null {
  const days = parseScheduleDays(schedule);
  if (days === null) {
    return null;
  }

  for (let i = 1; i <= 14; i++) {
    const candidate = dateAdd(fromDateKey, i);
    if (days.includes(getDayAbbrev(candidate))) {
      return candidate;
    }
  }

  return null;
}

/**
 * Format a date key as a friendly label relative to today.
 * e.g. "Today", "Tomorrow", "May 18"
 */
export function formatNextDayLabel(dateKey: string | null): string {
  if (!dateKey) {
    return "";
  }

  const today = todayKey();
  if (dateKey === today) {
    return "Today";
  }
  if (dateKey === dateAdd(today, 1)) {
    return "Tomorrow";
  }

  return fmt.short(dateKey);
}
