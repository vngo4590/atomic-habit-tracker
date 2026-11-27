/**
 * formation — where a habit stands on the 66-day formation journey shown on
 * the detail page. Mirrors the Hall of Fame threshold. Pure.
 */

import type { FormationVerdict } from "@/lib/types";

/** A habit becomes eligible for its formation review after 66 days. */
export const FORMATION_DAYS = 66;

/** Whole days between two YYYY-MM-DD keys (never negative). */
export function daysBetween(fromKey: string, toKey: string): number {
  const start = new Date(`${fromKey}T00:00:00`).getTime();
  const end = new Date(`${toKey}T00:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

export type FormationStatus =
  | { kind: "growing"; age: number; progress: number }
  | { kind: "ready"; age: number }
  | { kind: "formed"; verdict: FormationVerdict }
  | { kind: "not-yet"; verdict: FormationVerdict };

/** The habit's formation status: a verdict wins, otherwise its age decides. */
export function formationStatus(
  createdAt: string,
  today: string,
  verdict: FormationVerdict | undefined,
): FormationStatus {
  if (verdict) return verdict.formed ? { kind: "formed", verdict } : { kind: "not-yet", verdict };
  const age = daysBetween(createdAt, today);
  if (age >= FORMATION_DAYS) return { kind: "ready", age };
  return { kind: "growing", age, progress: age / FORMATION_DAYS };
}
