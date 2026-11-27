import "server-only";

/**
 * Shared types and helpers for the backup importer (`mergeBackup`) and its
 * per-block import steps.
 */

import { db as defaultDb } from "@/lib/db/client";

export type DbClient = typeof defaultDb;

export type Tx = Parameters<Parameters<DbClient["$transaction"]>[0]>[0];

/**
 * Per-category counts returned after a merge import so the UI can tell the user
 * exactly what was restored (e.g. "12 habits, 340 check-ins").
 */
export interface ImportSummary {
  habits: number;
  checkIns: number;
  notes: number;
  contracts: number;
  journal: number;
  weeklyReviews: number;
  lessons: number;
  formationVerdicts: number;
  identity: boolean;
  preferences: boolean;
  /** Records skipped because they collided with another user or referenced a missing parent. */
  skipped: number;
}

export function emptySummary(): ImportSummary {
  return {
    habits: 0,
    checkIns: 0,
    notes: 0,
    contracts: 0,
    journal: 0,
    weeklyReviews: 0,
    lessons: 0,
    formationVerdicts: 0,
    identity: false,
    preferences: false,
    skipped: 0,
  };
}

/** Convert a YYYY-MM-DD (or ISO) string into a UTC midnight Date for DateTime columns. */
export function toDate(value: string): Date {
  // Date keys ("2026-06-02") need an explicit time so they don't drift by zone.
  const normalized = value.length === 10 ? `${value}T00:00:00.000Z` : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
