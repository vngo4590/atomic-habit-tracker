/**
 * Shared test setup for the split store tests.
 *
 * Used by sibling files (store.mutations.test.ts,
 * store.streak.test.ts). Each split file installs its own vi.mock for
 * @/lib/helpers (to pin todayKey to a Wednesday so schedule-aware
 * streak tests are deterministic) and @/lib/actions/domain (to keep
 * the unit tests free of any real server-action work).
 *
 * Mock functions live as plain module exports (not vi.hoisted) so they
 * can be re-exported safely; vi.mock factory closures evaluate lazily.
 */

import { vi } from "vitest";

import type { Habit } from "@/lib/types";
import { todayKey } from "@/lib/helpers";

/** Build a Habit fixture with a supplied history map. */
export function makeStoreTestHabit(history: Habit["history"]): Habit {
  return {
    id: "1",
    name: "Test habit",
    emoji: "•",
    cue: "",
    craving: "",
    response: "",
    reward: "",
    loopCue: "",
    loopCraving: "",
    loopResponse: "",
    loopReward: "",
    twoMin: "",
    identity: "tester",
    environment: "",
    schedule: "Daily",
    time: "Morning",
    contract: "",
    contractPartners: [],
    history,
    notes: [],
    createdAt: todayKey(),
  };
}

/** Stand-in localStorage for tests. Each test gets a fresh map. */
export function makeLocalStorageMock() {
  const map = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => map.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      map.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      map.delete(key);
    }),
    clear: vi.fn(() => map.clear()),
  };
}
