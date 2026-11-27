/**
 * identity-suggestions — the identities a user already uses, offered as
 * one-tap chips in the create wizard. Pure.
 */

import type { Habit } from "@/lib/types";

/** Every identity used by the user's habits, most-used first. */
export function rankIdentities(habits: Pick<Habit, "identity">[]): string[] {
  const counts = new Map<string, number>();
  for (const habit of habits) {
    if (habit.identity) counts.set(habit.identity, (counts.get(habit.identity) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([identity]) => identity);
}

/** Top five when the field is empty; otherwise every case-insensitive match. */
export function visibleIdentities(ranked: string[], query: string, limit = 5): string[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return ranked.slice(0, limit);
  return ranked.filter((identity) => identity.toLowerCase().includes(trimmed));
}
