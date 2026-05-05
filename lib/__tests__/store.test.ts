import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { dateAdd, todayKey } from "@/lib/helpers";
import {
  createJournalEntryAction,
  saveIdentityAction,
  updateHabitAction,
  updateJournalEntryAction,
  deleteHabitAction,
} from "@/lib/actions/domain";
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
  saveIdentityAction: vi.fn(async (identity) => identity),
  savePreferencesAction: vi.fn(),
  saveWeeklyReviewAction: vi.fn(),
  toggleHabitAction: vi.fn(async () => null),
  updateHabitAction: vi.fn(async () => null),
  updateJournalEntryAction: vi.fn(async () => null),
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
    loopCue: "",
    loopCraving: "",
    loopResponse: "",
    loopReward: "",
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
    vi.mocked(createJournalEntryAction).mockImplementation(async (entry) => ({
      id: "saved-journal",
      date: entry.date ?? todayKey(),
      title: entry.title ?? "",
      body: entry.body ?? "",
      mood: entry.mood ?? "good",
      tags: entry.tags ?? [],
    }));
    vi.mocked(saveIdentityAction).mockImplementation(async (identity) => identity);
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

  it("preserves identity statement spaces while async saves resolve out of order", async () => {
    let resolveFirst: (identity: { statement: string; values: string[] }) => void = () => {};
    let resolveSecond: (identity: { statement: string; values: string[] }) => void = () => {};
    vi.mocked(saveIdentityAction)
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));

    const { result } = renderHook(() =>
      useStore({
        habits: [],
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

    act(() => result.current.setIdentity({ statement: "I am ", values: [] }));
    act(() => result.current.setIdentity({ statement: "I am a beautiful person", values: [] }));

    await act(async () => {
      resolveFirst({ statement: "I am", values: [] });
      await Promise.resolve();
    });
    expect(result.current.identity.statement).toBe("I am a beautiful person");

    await act(async () => {
      resolveSecond({ statement: "I am a beautiful person", values: [] });
      await Promise.resolve();
    });
    expect(result.current.identity.statement).toBe("I am a beautiful person");
  });

  it("updates existing journal entries instead of creating duplicates", async () => {
    const { result } = renderHook(() =>
      useStore({
        habits: [],
        journal: [{ id: "j1", date: "2030-01-01", title: "Old", body: "Draft", mood: "meh", tags: [] }],
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

    act(() => result.current.updateJournal("j1", { title: "Edited", body: "Kept", mood: "good" }));

    expect(result.current.journal).toHaveLength(1);
    expect(result.current.journal[0]).toMatchObject({ id: "j1", title: "Edited", body: "Kept", mood: "good" });
    expect(updateJournalEntryAction).toHaveBeenCalledWith("j1", { title: "Edited", body: "Kept", mood: "good" });
  });

  it("keeps edits made to a pending journal entry when the create save returns", async () => {
    let resolveCreate: (entry: { id: string; date: string; title: string; body: string; mood: string; tags: string[] }) => void = () => {};
    vi.mocked(createJournalEntryAction).mockReturnValueOnce(new Promise((resolve) => { resolveCreate = resolve; }));

    const { result } = renderHook(() =>
      useStore({
        habits: [],
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

    act(() => result.current.addJournal({ title: "Original", body: "First", mood: "hard", tags: [] }));
    const pendingId = result.current.journal[0].id;
    act(() => result.current.updateJournal(pendingId, { title: "Edited before create finished", body: "Second", mood: "good" }));

    await act(async () => {
      resolveCreate({ id: "saved-journal", date: todayKey(), title: "Original", body: "First", mood: "hard", tags: [] });
      await Promise.resolve();
    });

    expect(result.current.journal).toHaveLength(1);
    expect(result.current.journal[0]).toMatchObject({
      id: "saved-journal",
      title: "Edited before create finished",
      body: "Second",
      mood: "good",
    });
    expect(updateJournalEntryAction).toHaveBeenCalledWith("saved-journal", {
      date: todayKey(),
      title: "Edited before create finished",
      body: "Second",
      mood: "good",
      tags: [],
    });
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
