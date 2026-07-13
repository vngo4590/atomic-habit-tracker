/**
 * Shared test setup for the split user-flows tests.
 *
 * Each flow describe lives in its own file (user-flows.lifecycle,
 * user-flows.identity, user-flows.journal, user-flows.weekly-review,
 * user-flows.lessons, user-flows.settings) so failures point at the
 * specific user journey that broke.
 *
 * The mock functions exported here are plain `vi.fn()` instances. The
 * vi.mock call in each test file references them inside its factory
 * closure (factories evaluate lazily, so cross-module references work).
 */

import { beforeEach, vi } from "vitest";

import {
  createHabitAction,
  createJournalEntryAction,
  markLessonReadAction,
  saveFormationVerdictAction,
  savePreferencesAction,
  saveWeeklyReviewAction,
  toggleHabitAction,
  updateJournalEntryAction,
} from "@/lib/actions/domain";
import { todayKey } from "@/lib/helpers";
import { testHabit, testPreferences } from "@/lib/test/fixtures";
import type { StoreSnapshot } from "@/lib/types";

/** Build a default StoreSnapshot with empty domain collections. */
export function makeSnapshot(patch: Partial<StoreSnapshot> = {}) {
  return {
    habits: [],
    journal: [],
    identity: { statement: "", values: [] },
    weeklyReview: { wentWell: "", smallestFix: "", identityVote: "" },
    weeklyReviews: [],
    completedLessons: [],
    formationVerdicts: [],
    preferences: testPreferences(),
    ...patch,
  };
}

/**
 * Install a fresh localStorage stub and wire up default mock
 * implementations for every server action this suite touches. Called
 * from each split file's `beforeEach`.
 */
export function installUserFlowMocks() {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageMock,
  });
  vi.stubGlobal("localStorage", localStorageMock);
  vi.useRealTimers();

  vi.mocked(createHabitAction).mockImplementation(async (draft) => ({
    ok: true,
    habit: {
      ...testHabit(),
      ...draft,
      id: "server_habit",
      history: {},
      notes: [],
      createdAt: todayKey(),
    },
  }));
  vi.mocked(toggleHabitAction).mockImplementation(async () => null);
  vi.mocked(saveFormationVerdictAction).mockImplementation(async (verdict) => verdict);
  vi.mocked(savePreferencesAction).mockImplementation(async (preferences) => ({
    ...testPreferences(),
    ...preferences,
  }));
  vi.mocked(saveWeeklyReviewAction).mockImplementation(async (weekStartKey, answers) => ({
    weekStartKey,
    ...answers,
    updatedAt: new Date().toISOString(),
  }));
  vi.mocked(createJournalEntryAction).mockImplementation(async (entry) => ({
    id: "saved_journal",
    date: entry.date ?? todayKey(),
    title: entry.title ?? "",
    body: entry.body ?? "",
    mood: entry.mood ?? "good",
    tags: entry.tags ?? [],
  }));
  vi.mocked(updateJournalEntryAction).mockImplementation(async () => null);
  vi.mocked(markLessonReadAction).mockImplementation(async (lessonId: number) => [lessonId]);

  return localStorageMock;
}

/** Convenience that wires installUserFlowMocks into a beforeEach hook.
 *  Named with the `install` prefix (not `use`) so the React-hooks ESLint
 *  rule does not mistake it for a hook. */
export function installUserFlowMocksHook() {
  beforeEach(() => {
    installUserFlowMocks();
  });
}
