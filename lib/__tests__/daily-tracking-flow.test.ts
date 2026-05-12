import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkInSchema } from "@/lib/contracts/domain";
import { todayKey } from "@/lib/helpers";
import { logCheckInAction, toggleHabitAction } from "@/lib/actions/domain";
import { testHabit } from "@/lib/test/fixtures";
import { useStore } from "@/lib/store";
import type { Habit } from "@/lib/types";

// ---------------------------------------------------------------------------
// Mocks — we test the store layer so actions are mocked; contracts are pure
// ---------------------------------------------------------------------------
vi.mock("@/lib/actions/domain", () => ({
  createHabitAction: vi.fn(async () => null),
  createJournalEntryAction: vi.fn(),
  deleteHabitAction: vi.fn(),
  logCheckInAction: vi.fn(async () => null),
  markLessonReadAction: vi.fn(),
  saveFormationVerdictAction: vi.fn(),
  saveIdentityAction: vi.fn(async (identity: unknown) => identity),
  savePreferencesAction: vi.fn(),
  saveWeeklyReviewAction: vi.fn(),
  toggleHabitAction: vi.fn(async () => null),
  updateHabitAction: vi.fn(async () => null),
  updateJournalEntryAction: vi.fn(async () => null),
}));

// ---------------------------------------------------------------------------
// Helper: minimal StoreSnapshot
// ---------------------------------------------------------------------------
function makeSnapshot(habits: Habit[]) {
  return {
    habits,
    journal: [],
    identity: { statement: "", values: [] },
    weeklyReview: { wentWell: "", smallestFix: "", identityVote: "" },
    weeklyReviews: [],
    completedLessons: [],
    formationVerdicts: [],
    preferences: {
      theme: "light" as const,
      accentHue: 60,
      remindersEnabled: true,
      weeklyReviewNudge: true,
      accountabilityNudge: false,
      onboardingSeen: false,
      lessonMode: "sequential" as const,
      timezone: "UTC",
    },
  };
}

// ---------------------------------------------------------------------------
// checkInSchema — date key format and mood boundary validation
// ---------------------------------------------------------------------------
describe("checkInSchema edge cases", () => {
  it("rejects date keys that use the wrong separator or field order", () => {
    // Given: date strings that are not YYYY-MM-DD
    const slashSeparated = { dateKey: "2030/01/15" };
    const reversedOrder = { dateKey: "15-01-2030" };
    const noSeparator = { dateKey: "20300115" };

    // When + Then: all three non-standard formats are rejected
    expect(checkInSchema.safeParse(slashSeparated).success).toBe(false);
    expect(checkInSchema.safeParse(reversedOrder).success).toBe(false);
    expect(checkInSchema.safeParse(noSeparator).success).toBe(false);
  });

  it("enforces mood is between 1 and 5 inclusive", () => {
    // Given: mood values at, below, and above the valid range
    const base = { dateKey: "2030-01-15" };

    // When + Then: 0 and 6 are rejected; 1 and 5 are accepted
    expect(checkInSchema.safeParse({ ...base, mood: 0 }).success).toBe(false);
    expect(checkInSchema.safeParse({ ...base, mood: 1 }).success).toBe(true);
    expect(checkInSchema.safeParse({ ...base, mood: 5 }).success).toBe(true);
    expect(checkInSchema.safeParse({ ...base, mood: 6 }).success).toBe(false);
  });

  it("accepts mood as null — clears a previously recorded mood", () => {
    // Given: a check-in payload that explicitly removes the mood rating
    const input = { dateKey: "2030-01-15", mood: null };

    // When + Then: null is a valid mood value (nullable field)
    expect(checkInSchema.safeParse(input).success).toBe(true);
  });

  it("defaults done to true when the field is omitted", () => {
    // Given: a minimal check-in with only a date key
    const input = { dateKey: "2030-01-15" };

    // When: the schema parses the input
    const result = checkInSchema.parse(input);

    // Then: done is coerced to true so every check-in defaults to completed
    expect(result.done).toBe(true);
  });

  it("accepts a journal entry at exactly 2000 characters and rejects at 2001", () => {
    // Given: journal text right at and just over the character limit
    const base = { dateKey: "2030-01-15" };
    const at2000 = { ...base, journal: "x".repeat(2000) };
    const at2001 = { ...base, journal: "x".repeat(2001) };

    // When + Then
    expect(checkInSchema.safeParse(at2000).success).toBe(true);
    expect(checkInSchema.safeParse(at2001).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// logCheckIn store — optimistic history updates
// ---------------------------------------------------------------------------
describe("logCheckIn store optimistic update", () => {
  const TODAY = todayKey();

  beforeEach(() => {
    vi.useRealTimers();
    vi.mocked(logCheckInAction).mockReset();
    vi.mocked(logCheckInAction).mockReturnValue(new Promise(() => {}));
  });

  it("immediately writes the check-in payload to history before the server responds", () => {
    // Given: a habit with no history today
    const habit = testHabit({ id: "h1", history: {} });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: logCheckIn is called with a mood rating
    act(() => result.current.logCheckIn("h1", { mood: 5 }));

    // Then: the history entry is immediately visible — done: true and mood: 5
    const entry = result.current.habits[0].history[TODAY];
    expect(entry).toMatchObject({ done: true, mood: 5 });
  });

  it("merges a new field into an existing check-in without removing prior fields", () => {
    // Given: a habit that already has a mood recorded today
    const habit = testHabit({ id: "h1", history: { [TODAY]: { done: true, mood: 4 } } });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: logCheckIn adds a journal note
    act(() => result.current.logCheckIn("h1", { journal: "Stayed consistent" }));

    // Then: both the existing mood and the new journal are present in the entry
    const entry = result.current.habits[0].history[TODAY];
    expect(entry).toMatchObject({ done: true, mood: 4, journal: "Stayed consistent" });
  });

  it("removes the mood key from history when the payload sets mood: undefined", () => {
    // Given: a habit that has a mood recorded today
    const habit = testHabit({ id: "h1", history: { [TODAY]: { done: true, mood: 3 } } });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: logCheckIn is called with mood: undefined — the user cleared their rating
    act(() => result.current.logCheckIn("h1", { mood: undefined }));

    // Then: the mood key is no longer present in the optimistic entry
    const entry = result.current.habits[0].history[TODAY] as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(entry, "mood")).toBe(false);
  });

  it("replaces the optimistic entry with the server version once the action resolves", async () => {
    // Given: a server that returns a reconciled habit with additional fields
    const serverHabit = testHabit({
      id: "h1",
      history: { [TODAY]: { done: true, mood: 5, journal: "Confirmed by server" } },
    });
    let resolveAction!: (h: typeof serverHabit) => void;
    vi.mocked(logCheckInAction).mockReturnValueOnce(
      new Promise((resolve) => { resolveAction = resolve; }),
    );

    const habit = testHabit({ id: "h1", history: {} });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    act(() => result.current.logCheckIn("h1", { mood: 5 }));

    // When: the server action resolves with its authoritative version
    await act(async () => {
      resolveAction(serverHabit);
      await Promise.resolve();
    });

    // Then: the store reflects the server's data
    const entry = result.current.habits[0].history[TODAY];
    expect(entry).toMatchObject({ journal: "Confirmed by server" });
  });

  it("leaves other habits unchanged when logCheckIn targets a specific habit", () => {
    // Given: two habits in the store
    const habitA = testHabit({ id: "hA", history: {} });
    const habitB = testHabit({ id: "hB", history: {} });
    const { result } = renderHook(() => useStore(makeSnapshot([habitA, habitB])));

    // When: logCheckIn is called only for habitA
    act(() => result.current.logCheckIn("hA", { mood: 4 }));

    // Then: habitB's history is untouched
    expect(result.current.habits.find((h) => h.id === "hB")?.history[TODAY]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// toggleHabit — toast notification behavior
// ---------------------------------------------------------------------------
describe("toggleHabit toast notifications", () => {
  const TODAY = todayKey();

  beforeEach(() => {
    // Use fake timers so the 2400ms auto-dismiss doesn't fire during assertions
    vi.useFakeTimers();
    vi.mocked(toggleHabitAction).mockReset();
    vi.mocked(toggleHabitAction).mockReturnValue(new Promise(() => {}));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows an identity vote toast on the first check-in of the day", () => {
    // Given: a habit with no prior check-in today
    const habit = testHabit({ id: "h1", identity: "reader", history: {} });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: the habit is toggled on for the first time today
    act(() => result.current.toggleHabit("h1", TODAY));

    // Then: a toast acknowledges the identity vote was cast
    expect(result.current.toast?.msg).toBe('Vote cast for "reader"');
  });

  it("includes the cumulative total vote count in the toast subtitle", () => {
    // Given: a habit with two prior check-ins; today will be the third vote
    const habit = testHabit({
      id: "h1",
      identity: "reader",
      history: { "2030-01-01": true, "2030-01-02": true },
    });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: the habit is checked in today
    act(() => result.current.toggleHabit("h1", TODAY));

    // Then: the subtitle reflects the new cumulative count
    expect(result.current.toast?.sub).toBe("3 total");
  });

  it("does not show a toast when toggling an existing check-in off", () => {
    // Given: a habit already marked done today
    const habit = testHabit({ id: "h1", identity: "reader", history: { [TODAY]: true } });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: the user unchecks the habit
    act(() => result.current.toggleHabit("h1", TODAY));

    // Then: no vote toast — removing a check-in is not a new identity vote
    expect(result.current.toast).toBeNull();
  });

  it("does not show a toast when updating an already-completed check-in with a payload", () => {
    // Given: a habit already done today with an existing check-in object
    const habit = testHabit({
      id: "h1",
      identity: "reader",
      history: { [TODAY]: { done: true } },
    });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: toggleHabit is called with a payload on the same date
    act(() => result.current.toggleHabit("h1", TODAY, { mood: 4 }));

    // Then: no toast — this is an update, not a first-time vote
    expect(result.current.toast).toBeNull();
  });
});
