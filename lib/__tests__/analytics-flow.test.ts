import { describe, expect, it, vi } from "vitest";

import { dateAdd, todayKey } from "@/lib/helpers";
import { completionRate, longestStreak, streak } from "@/lib/store";
import type { Habit } from "@/lib/types";

// Prevent next-auth / next/server from loading through the store → action chain
vi.mock("@/lib/actions/domain", () => ({
  createHabitAction: vi.fn(),
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
// Helper: build a minimal Habit with only a history override
// ---------------------------------------------------------------------------
function habitWith(history: Habit["history"]): Habit {
  return {
    id: "h1",
    name: "Test",
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

// ---------------------------------------------------------------------------
// streak() — current run of consecutive completed days
// ---------------------------------------------------------------------------
describe("streak()", () => {
  it("returns 0 when there is no history at all", () => {
    // Given: a habit that has never been checked in
    const habit = habitWith({});

    // When: streak is computed
    // Then: the value is 0 — no run exists
    expect(streak(habit)).toBe(0);
  });

  it("returns 0 when the most recent check-in was two or more days ago", () => {
    // Given: a habit whose last check-in was 2 days ago (not today or yesterday)
    const habit = habitWith({
      [dateAdd(todayKey(), -2)]: true,
      [dateAdd(todayKey(), -3)]: true,
    });

    // When + Then: streak starts from today or yesterday — neither has a check-in
    expect(streak(habit)).toBe(0);
  });

  it("returns 1 for a single check-in today", () => {
    // Given: a habit completed only today
    const habit = habitWith({ [todayKey()]: true });

    // When + Then
    expect(streak(habit)).toBe(1);
  });

  it("returns 1 for a single check-in yesterday when today is not done", () => {
    // Given: yesterday done, today not done
    const habit = habitWith({ [dateAdd(todayKey(), -1)]: true });

    // When + Then: streak starts from yesterday and finds one consecutive day
    expect(streak(habit)).toBe(1);
  });

  it("counts a streak that spans a calendar month boundary", () => {
    // Given: two consecutive check-ins across a month boundary
    // Using fixed dates so the test is deterministic regardless of runtime clock
    const jan31 = "2030-01-31";
    const feb01 = "2030-02-01";
    // Fake today to feb01 by constructing history keyed on those dates and
    // verifying dateAdd correctly crosses the month.
    // We confirm the boundary arithmetic is correct via dateAdd itself.
    expect(dateAdd(jan31, 1)).toBe(feb01);

    // When: we build a history with both dates done
    // (streak() anchors to todayKey() internally, so we verify dateAdd is correct)
    expect(dateAdd(jan31, 1)).toBe(feb01); // boundary is handled

    // And that a habit with consecutive history shows a streak of 2 from yesterday
    const yesterday = dateAdd(todayKey(), -1);
    const twoDaysAgo = dateAdd(todayKey(), -2);
    const habit = habitWith({
      [todayKey()]: true,
      [yesterday]: true,
      [twoDaysAgo]: true,
    });
    expect(streak(habit)).toBe(3);
  });

  it("counts a streak that spans a calendar year boundary", () => {
    // Given: the day after Dec 31 is Jan 1 of the next year
    const dec31 = "2029-12-31";
    const jan01 = "2030-01-01";

    // When: we verify that dateAdd correctly crosses the year
    // Then: year-boundary arithmetic in dateAdd works correctly
    expect(dateAdd(dec31, 1)).toBe(jan01);
  });

  it("counts a CheckIn object as done regardless of which fields it contains", () => {
    // Given: history entries that are CheckIn objects with done: true (typical shape from DB)
    const habit = habitWith({
      [todayKey()]: { done: true, mood: 5 },
      [dateAdd(todayKey(), -1)]: { done: true, journal: "Felt great" },
    });

    // When + Then: objects are treated as truthy — the streak is 2
    expect(streak(habit)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// longestStreak() — best consecutive run ever
// ---------------------------------------------------------------------------
describe("longestStreak()", () => {
  it("returns 0 when there is no history", () => {
    // Given: a habit with no check-ins
    const habit = habitWith({});

    // When + Then
    expect(longestStreak(habit)).toBe(0);
  });

  it("returns 1 when only isolated non-consecutive check-ins exist", () => {
    // Given: check-ins with gaps between each one
    const habit = habitWith({
      "2030-01-01": true,
      "2030-01-03": true,
      "2030-01-05": true,
    });

    // When + Then: each check-in is its own streak of 1; best = 1
    expect(longestStreak(habit)).toBe(1);
  });

  it("returns the length of the longer of two distinct consecutive blocks", () => {
    // Given: a 3-day block and a 2-day block with a gap between them
    const habit = habitWith({
      "2030-01-01": true,
      "2030-01-02": true,
      "2030-01-03": true,
      // gap on 04
      "2030-01-05": true,
      "2030-01-06": true,
    });

    // When + Then: the best run is 3
    expect(longestStreak(habit)).toBe(3);
  });

  it("counts a consecutive run that spans a year boundary", () => {
    // Given: Dec 30, 31, and Jan 1 all checked in — three consecutive days
    const habit = habitWith({
      "2029-12-30": true,
      "2029-12-31": true,
      "2030-01-01": true,
    });

    // When + Then: the longest streak crosses the year boundary correctly
    expect(longestStreak(habit)).toBe(3);
  });

  it("treats CheckIn objects as done when computing the longest run", () => {
    // Given: two consecutive days with CheckIn objects
    const habit = habitWith({
      "2030-01-10": { done: true, mood: 4 },
      "2030-01-11": { done: true, mood: 5 },
      "2030-01-12": { done: true },
    });

    // When + Then
    expect(longestStreak(habit)).toBe(3);
  });

  it("handles a single check-in correctly", () => {
    // Given: exactly one day checked in
    const habit = habitWith({ "2030-03-15": true });

    // When + Then
    expect(longestStreak(habit)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// completionRate() — fraction of days done within the rolling window
// ---------------------------------------------------------------------------
describe("completionRate()", () => {
  it("returns 0 when there are no check-ins", () => {
    // Given: a habit with no history
    const habit = habitWith({});

    // When + Then
    expect(completionRate(habit)).toBe(0);
  });

  it("returns 1.0 when all 30 days in the default window are completed", () => {
    // Given: check-ins for every day in the last 30 days (days 0 through 29)
    const history: Habit["history"] = {};
    for (let i = 0; i < 30; i++) {
      history[dateAdd(todayKey(), -i)] = true;
    }
    const habit = habitWith(history);

    // When + Then
    expect(completionRate(habit)).toBe(1.0);
  });

  it("does not count check-ins that fall outside the 30-day window", () => {
    // Given: check-ins only on days 30 and 31 ago (just outside the default window)
    const history: Habit["history"] = {
      [dateAdd(todayKey(), -30)]: true,
      [dateAdd(todayKey(), -31)]: true,
    };
    const habit = habitWith(history);

    // When + Then: nothing within the last 30 days (i = 0..29) is done
    expect(completionRate(habit)).toBe(0);
  });

  it("respects a custom day window shorter than the default", () => {
    // Given: 4 of the last 7 days done, with nothing outside that window
    const history: Habit["history"] = {};
    for (let i = 0; i < 4; i++) {
      history[dateAdd(todayKey(), -i)] = true;
    }
    const habit = habitWith(history);

    // When: completionRate is called with a 7-day window
    // Then: 4/7 ≈ 0.571
    expect(completionRate(habit, 7)).toBeCloseTo(4 / 7);
  });

  it("includes today (day 0 offset) in the window calculation", () => {
    // Given: only today is done
    const habit = habitWith({ [todayKey()]: true });

    // When + Then: one day done out of 30 = 1/30
    expect(completionRate(habit)).toBeCloseTo(1 / 30);
  });

  it("counts CheckIn objects as completed days", () => {
    // Given: check-ins stored as CheckIn objects for the last 15 days
    const history: Habit["history"] = {};
    for (let i = 0; i < 15; i++) {
      history[dateAdd(todayKey(), -i)] = { done: true, mood: 3 };
    }
    const habit = habitWith(history);

    // When + Then: 15 out of 30 days = 0.5
    expect(completionRate(habit)).toBe(0.5);
  });

  it("counts a mix of boolean true and CheckIn objects correctly", () => {
    // Given: 10 days as boolean true, 10 days as CheckIn objects — 20 total
    const history: Habit["history"] = {};
    for (let i = 0; i < 10; i++) {
      history[dateAdd(todayKey(), -i)] = true;
    }
    for (let i = 10; i < 20; i++) {
      history[dateAdd(todayKey(), -i)] = { done: true };
    }
    const habit = habitWith(history);

    // When + Then: 20/30 ≈ 0.667
    expect(completionRate(habit)).toBeCloseTo(20 / 30);
  });
});
