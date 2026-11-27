import { dateAdd, fmt, todayKey } from "@/lib/helpers";

/** Monday (ISO week start) of the week containing `dateKey` (YYYY-MM-DD). */
export function weekStartOf(dateKey: string): string {
  const weekday = new Date(`${dateKey}T00:00:00`).getDay(); // 0 = Sunday
  return dateAdd(dateKey, -((weekday + 6) % 7));
}

/** Human label for a week: "This week", "Last week" or "Week of Nov 9". */
export function weekLabel(weekStart: string, today: string = todayKey()): string {
  const current = weekStartOf(today);
  if (weekStart === current) return "This week";
  if (weekStart === dateAdd(current, -7)) return "Last week";
  return `Week of ${fmt.short(weekStart)}`;
}

export interface WeekGroup<T> {
  weekStart: string;
  label: string;
  items: T[];
}

/**
 * Bucket items (already sorted newest-first) into calendar weeks, keeping
 * their order. Groups come out newest week first.
 */
export function groupByWeek<T extends { date: string }>(items: T[], today: string = todayKey()): WeekGroup<T>[] {
  const groups: WeekGroup<T>[] = [];
  for (const item of items) {
    const weekStart = weekStartOf(item.date.slice(0, 10));
    const last = groups[groups.length - 1];
    if (last && last.weekStart === weekStart) {
      last.items.push(item);
    } else {
      groups.push({ weekStart, label: weekLabel(weekStart, today), items: [item] });
    }
  }
  return groups;
}
