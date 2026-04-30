import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { dateAdd, todayKey } from "@/lib/helpers";
import {
  completionRate,
  longestStreak,
  streak,
  useStore,
} from "@/lib/store";
import type { Habit } from "@/lib/types";

vi.mock("@/lib/actions/domain", () => ({
  createHabitAction: vi.fn(),
  createJournalEntryAction: vi.fn(),
  deleteHabitAction: vi.fn(),
  logCheckInAction: vi.fn(async () => null),
  markLessonReadAction: vi.fn(),
  saveFormationVerdictAction: vi.fn(),
  saveIdentityAction: vi.fn(),
  savePreferencesAction: vi.fn(),
  saveWeeklyReviewAction: vi.fn(),
  toggleHabitAction: vi.fn(async () => null),
  updateHabitAction: vi.fn(),
}));

function makeHabit(history: Habit["history"]): Habit {
  return {
    id: "1",
    name: "Test habit",
    emoji: "•",
    cue: "",
    craving: "",
    response: "",
    reward: "",
    twoMin: "",
    stack: "",
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

describe("store mutations", () => {
  beforeEach(() => {
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
});

describe("streak calculations", () => {
  it("counts consecutive days ending today", () => {
    const today = todayKey();
    const habit = makeHabit({
      [today]: true,
      [dateAdd(today, -1)]: true,
      [dateAdd(today, -2)]: true,
      [dateAdd(today, -3)]: true,
      [dateAdd(today, -4)]: true,
    });

    expect(streak(habit)).toBe(5);
  });

  it("starts from yesterday when today is not done", () => {
    const today = todayKey();
    const habit = makeHabit({
      [dateAdd(today, -1)]: true,
      [dateAdd(today, -2)]: true,
      [dateAdd(today, -4)]: true,
    });

    expect(streak(habit)).toBe(2);
  });

  it("finds the longest streak", () => {
    const today = todayKey();
    const habit = makeHabit({
      [dateAdd(today, -10)]: true,
      [dateAdd(today, -9)]: true,
      [dateAdd(today, -8)]: true,
      [dateAdd(today, -4)]: true,
      [dateAdd(today, -3)]: true,
    });

    expect(longestStreak(habit)).toBe(3);
  });

  it("calculates completion rate over N days", () => {
    const today = todayKey();
    const history: Habit["history"] = {};
    for (let i = 0; i < 24; i++) {
      history[dateAdd(today, -i)] = true;
    }

    expect(completionRate(makeHabit(history), 30)).toBe(0.8);
  });
});
