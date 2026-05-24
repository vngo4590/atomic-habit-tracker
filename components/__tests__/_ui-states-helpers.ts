/**
 * Shared test setup for the split ui-states tests.
 *
 * Used by sibling files (ui-states.empty-states.test.tsx,
 * ui-states.schedule.test.tsx, etc.) so each describe block lives in
 * its own focused file. Each split file installs its own vi.mock calls
 * via the helpers defined here.
 *
 * The mock objects here are plain module-level exports (not
 * `vi.hoisted`) because `vi.hoisted` returns cannot be re-exported.
 * Vitest hoists `vi.mock` calls to the top of each test file but the
 * factory closures are evaluated lazily, so they can safely read
 * `storeMock.x` / `routerMock.x` at the time the mocked module is
 * imported.
 */

import { vi } from "vitest";
import { cleanup } from "@testing-library/react";

import type { Habit } from "@/lib/types";

/** Router spy used across all ui-states tests. */
export const routerMock = {
  push: vi.fn(),
  back: vi.fn(),
};

/** Mutable params reference (Next.js routing). */
export const paramsMock: { current: { id: string } } = { current: { id: "missing-id" } };

/** Mutable store snapshot read by the useStoreContext mock. */
export const storeMock = {
  habits: [] as Habit[],
  journal: [] as never[],
  identity: { statement: "", values: [] as string[] },
  weeklyReview: { wentWell: "", smallestFix: "", identityVote: "" },
  weeklyReviews: [] as never[],
  completedLessons: new Set<number>(),
  lessonMode: "sequential" as const,
  formationVerdicts: [] as never[],
  preferences: {
    theme: "light" as "light" | "dark",
    accentHue: 60,
    remindersEnabled: true,
    weeklyReviewNudge: true,
    accountabilityNudge: false,
    onboardingSeen: false,
    lessonMode: "sequential" as "sequential" | "free",
    timezone: "UTC",
  },
  toast: null as { id: number; msg: string; sub?: string } | null,
  setHabits: vi.fn(),
  addHabit: vi.fn(),
  toggleHabit: vi.fn(),
  logCheckIn: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
  addJournal: vi.fn(),
  updateJournal: vi.fn(),
  setIdentity: vi.fn(),
  setWeeklyReview: vi.fn(),
  setLessonMode: vi.fn(),
  markLessonRead: vi.fn(),
  saveFormationVerdict: vi.fn(),
  setPreferences: vi.fn(),
  showToast: vi.fn(),
  streak: vi.fn(() => 0),
  longestStreak: vi.fn(() => 0),
  completionRate: vi.fn(() => 0),
};

/** Build a Habit fixture with sensible defaults. */
export function makeHabit(patch: Partial<Habit> = {}): Habit {
  return {
    id: "habit_1",
    name: "Read",
    emoji: "•",
    cue: "After coffee",
    craving: "",
    response: "Read one page",
    reward: "",
    loopCue: "",
    loopCraving: "",
    loopResponse: "",
    loopReward: "",
    twoMin: "",
    identity: "reader",
    environment: "",
    schedule: "Daily",
    time: "Morning",
    contract: "",
    contractPartners: [],
    history: {},
    notes: [],
    createdAt: "2030-01-01",
    ...patch,
  };
}

/** Reset the mutable store + router snapshots between tests. */
export function resetUiStateMocks() {
  storeMock.habits = [];
  storeMock.journal = [];
  storeMock.identity = { statement: "", values: [] };
  storeMock.weeklyReviews = [];
  storeMock.formationVerdicts = [];
  storeMock.toast = null;
  storeMock.preferences = {
    theme: "light" as const,
    accentHue: 60,
    remindersEnabled: true,
    weeklyReviewNudge: true,
    accountabilityNudge: false,
    onboardingSeen: false,
    lessonMode: "sequential" as const,
    timezone: "UTC",
  };
  paramsMock.current = { id: "missing-id" };
  vi.clearAllMocks();

  // Ensure localStorage is stubbed for applyAppearance
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
    writable: true,
  });
}

/** Teardown DOM side-effects between tests. */
export function teardownUiStateDom() {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.removeProperty("--accent");
  document.documentElement.style.removeProperty("--accent-2");
  document.documentElement.style.removeProperty("--accent-soft");
}
