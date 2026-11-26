import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { todayKey } from "@/lib/helpers";
import {
  createJournalEntryAction,
  markLessonReadAction,
  saveIdentityAction,
  updateJournalEntryAction,
} from "@/features/reflection/actions";
import { savePreferencesAction } from "@/features/settings/actions";
import { updateHabitAction, deleteHabitAction } from "@/features/habits/actions";
import { useStore } from "@/lib/store";
import type { Habit } from "@/lib/types";

import { makeLocalStorageMock, makeStoreTestHabit as makeHabit } from "@/lib/store/__tests__/store-test-helpers";

// Pin "today" to a Wednesday so schedule-aware streak tests are deterministic.
vi.mock("@/lib/helpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/helpers")>("@/lib/helpers");
  return {
    ...actual,
    todayKey: (...args: unknown[]) => {
      if (args.length > 0) return actual.todayKey(args[0] as never);
      return "2030-01-09";
    },
  };
});

vi.mock("@/features/habits/actions", () => ({
  createHabitAction: vi.fn(),
  deleteHabitAction: vi.fn(),
  logCheckInAction: vi.fn(async () => null),
  saveFormationVerdictAction: vi.fn(),
  toggleHabitAction: vi.fn(async () => null),
  updateHabitAction: vi.fn(async () => null),
}));
vi.mock("@/features/stacks/actions", () => ({
  applyStackMutationAction: vi.fn(),
}));
vi.mock("@/features/reflection/actions", () => ({
  createJournalEntryAction: vi.fn(),
  markLessonReadAction: vi.fn(),
  saveIdentityAction: vi.fn(async (identity) => identity),
  saveWeeklyReviewAction: vi.fn(),
  updateJournalEntryAction: vi.fn(async () => null),
}));
vi.mock("@/features/settings/actions", () => ({
  savePreferencesAction: vi.fn(),
}));

let localStorageMock: ReturnType<typeof makeLocalStorageMock>;

describe("store habit mutations", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    localStorageMock = {
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
    vi.mocked(createJournalEntryAction).mockImplementation(async (entry) => ({
      id: "saved-journal",
      date: entry.date ?? todayKey(),
      title: entry.title ?? "",
      body: entry.body ?? "",
      mood: entry.mood ?? "good",
      tags: entry.tags ?? [],
    }));
    vi.mocked(saveIdentityAction).mockImplementation(async (identity) => identity);
    vi.mocked(savePreferencesAction).mockImplementation(async (preferences) => ({
      theme: "light",
      accentHue: 60,
      remindersEnabled: true,
      weeklyReviewNudge: true,
      accountabilityNudge: false,
      onboardingSeen: false,
      lessonMode: "sequential",
      timezone: "UTC",
      ...preferences,
    }));
    vi.mocked(markLessonReadAction).mockImplementation(async (lessonId) => [lessonId]);
    vi.mocked(updateHabitAction).mockImplementation(async () => null);
    vi.mocked(updateJournalEntryAction).mockImplementation(async () => null);
  });

  it("toggles a habit on and off", () => {
    const { result } = renderHook(() =>
      useStore({
        habits: [makeHabit({})],
        journal: [],
        identity: { statement: "", values: [] },
        weeklyReview: { wentWell: "", smallestFix: "", identityVote: "" },
        completedLessons: [],
        formationVerdicts: [],
        preferences: {
          theme: "light",
          accentHue: 60,
          remindersEnabled: true,
          weeklyReviewNudge: true,
          accountabilityNudge: false,
          onboardingSeen: false,
          lessonMode: "sequential",
          timezone: "UTC",
        },
      }),
    );
    const id = result.current.habits[0].id;
    const key = "2030-01-01";

    act(() => result.current.toggleHabit(id, key));
    expect(result.current.habits[0].history[key]).toBeTruthy();

    act(() => result.current.toggleHabit(id, key));
    expect(result.current.habits[0].history[key]).toBeUndefined();
  });

  it("initializes from the backend snapshot without touching localStorage", () => {
    const { result } = renderHook(() =>
      useStore({
        habits: [makeHabit({})],
        journal: [],
        identity: { statement: "Backend identity", values: ["Curious"] },
        weeklyReview: { wentWell: "", smallestFix: "", identityVote: "" },
        completedLessons: [1, 2],
        formationVerdicts: [],
        preferences: {
          theme: "dark",
          accentHue: 120,
          remindersEnabled: true,
          weeklyReviewNudge: true,
          accountabilityNudge: false,
          onboardingSeen: true,
          lessonMode: "random",
          timezone: "UTC",
        },
      }),
    );

    expect(result.current.habits).toHaveLength(1);
    expect(result.current.identity.statement).toBe("Backend identity");
    expect(result.current.completedLessons.has(2)).toBe(true);
    expect(localStorageMock.getItem).not.toHaveBeenCalled();
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it("does not let stale habit saves reset newer 4 laws edits", async () => {
    let resolveFirst: (habit: Habit) => void = () => {};
    let resolveSecond: (habit: Habit) => void = () => {};
    vi.mocked(updateHabitAction)
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));

    const { result } = renderHook(() =>
      useStore({
        habits: [makeHabit({})],
        journal: [],
        identity: { statement: "", values: [] },
        weeklyReview: { wentWell: "", smallestFix: "", identityVote: "" },
        completedLessons: [],
        formationVerdicts: [],
        preferences: {
          theme: "light",
          accentHue: 60,
          remindersEnabled: true,
          weeklyReviewNudge: true,
          accountabilityNudge: false,
          onboardingSeen: false,
          lessonMode: "sequential",
          timezone: "UTC",
        },
      }),
    );

    act(() => result.current.updateHabit("1", { cue: "After coffee" }));
    act(() => result.current.updateHabit("1", { craving: "To feel clear" }));
    await act(async () => {
      resolveFirst({ ...result.current.habits[0], cue: "After coffee", craving: "" });
      await Promise.resolve();
    });
    expect(result.current.habits[0].craving).toBe("To feel clear");

    await act(async () => {
      resolveSecond({ ...result.current.habits[0], cue: "After coffee", craving: "To feel clear" });
      await Promise.resolve();
    });
    expect(result.current.habits[0].cue).toBe("After coffee");
    expect(result.current.habits[0].craving).toBe("To feel clear");
  });

  it("keeps loop edits independent from the 4 laws fields", () => {
    const { result } = renderHook(() =>
      useStore({
        habits: [makeHabit({})],
        journal: [],
        identity: { statement: "", values: [] },
        weeklyReview: { wentWell: "", smallestFix: "", identityVote: "" },
        completedLessons: [],
        formationVerdicts: [],
        preferences: {
          theme: "light",
          accentHue: 60,
          remindersEnabled: true,
          weeklyReviewNudge: true,
          accountabilityNudge: false,
          onboardingSeen: false,
          lessonMode: "sequential",
          timezone: "UTC",
        },
      }),
    );

    act(() => result.current.updateHabit("1", { cue: "Law cue" }));
    act(() => result.current.updateHabit("1", { loopCue: "Loop cue" }));

    expect(result.current.habits[0].cue).toBe("Law cue");
    expect(result.current.habits[0].loopCue).toBe("Loop cue");
    expect(updateHabitAction).toHaveBeenLastCalledWith("1", { loopCue: "Loop cue" });
  });

  it("removes a habit and archives it server-side", () => {
    const { result } = renderHook(() =>
      useStore({
        habits: [makeHabit({})],
        journal: [],
        identity: { statement: "", values: [] },
        weeklyReview: { wentWell: "", smallestFix: "", identityVote: "" },
        completedLessons: [],
        formationVerdicts: [],
        preferences: {
          theme: "light",
          accentHue: 60,
          remindersEnabled: true,
          weeklyReviewNudge: true,
          accountabilityNudge: false,
          onboardingSeen: false,
          lessonMode: "sequential",
          timezone: "UTC",
        },
      }),
    );

    act(() => result.current.deleteHabit("1"));

    expect(result.current.habits).toEqual([]);
    expect(deleteHabitAction).toHaveBeenCalledWith("1");
  });
});
