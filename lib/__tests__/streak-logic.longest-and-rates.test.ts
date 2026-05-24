import { describe, expect, it, vi } from "vitest";

import { dateAdd, todayKey } from "@/lib/helpers";
import { completionRate, longestStreak } from "@/lib/store";
import type { Habit } from "@/lib/types";

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

function makeHabit(history: Habit["history"]): Habit {
  return {
    id: "h1",
    name: "Test Habit",
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

const TODAY = todayKey();

describe("longest streak — finds best run across entire history", () => {
  it("finds the longest run when there are multiple streaks", () => {
    // Given: two separate streaks of 3 days and 5 days
    const habit = makeHabit({
      [dateAdd(TODAY, -10)]: true,
      [dateAdd(TODAY, -9)]: true,
      [dateAdd(TODAY, -8)]: true,
      [dateAdd(TODAY, -4)]: true,
      [dateAdd(TODAY, -3)]: true,
      [dateAdd(TODAY, -2)]: true,
      [dateAdd(TODAY, -1)]: true,
      [TODAY]: true,
    });

    // When + Then: the longest streak is the 5-day run
    expect(longestStreak(habit)).toBe(5);
  });

  it("returns 0 for empty history", () => {
    // Given: no check-ins at all
    const habit = makeHabit({});

    // When + Then: longest streak is 0
    expect(longestStreak(habit)).toBe(0);
  });

  it("returns 1 for a single isolated check-in", () => {
    // Given: exactly one check-in in history
    const habit = makeHabit({ [dateAdd(TODAY, -5)]: true });

    // When + Then: longest streak is 1
    expect(longestStreak(habit)).toBe(1);
  });

  it("returns the full count when all history days are consecutive", () => {
    // Given: 7 consecutive days in history
    const history: Habit["history"] = {};
    for (let i = 0; i < 7; i++) {
      history[dateAdd(TODAY, -i)] = true;
    }
    const habit = makeHabit(history);

    // When + Then: longest streak equals the total consecutive days
    expect(longestStreak(habit)).toBe(7);
  });

  it("does not merge non-consecutive days into the same streak", () => {
    // Given: two pairs of consecutive days with a 2-day gap between them
    const habit = makeHabit({
      [dateAdd(TODAY, -5)]: true,
      [dateAdd(TODAY, -4)]: true,
      [dateAdd(TODAY, -2)]: true,
      [dateAdd(TODAY, -1)]: true,
    });

    // When + Then: longest streak is 2 (the larger pair)
    expect(longestStreak(habit)).toBe(2);
  });

  it("handles scattered single-day check-ins", () => {
    // Given: isolated check-ins with gaps on all sides
    const habit = makeHabit({
      [dateAdd(TODAY, -10)]: true,
      [dateAdd(TODAY, -7)]: true,
      [dateAdd(TODAY, -3)]: true,
    });

    // When + Then: longest streak is 1 because no two days are consecutive
    expect(longestStreak(habit)).toBe(1);
  });
});

describe("completion rate over varying time windows", () => {
  it("is 100% when every day in the window is completed", () => {
    // Given: all 7 days in a 7-day window are checked in
    const history: Habit["history"] = {};
    for (let i = 0; i < 7; i++) {
      history[dateAdd(TODAY, -i)] = true;
    }
    const habit = makeHabit(history);

    // When + Then: rate is exactly 1.0
    expect(completionRate(habit, 7)).toBe(1);
  });

  it("is 0% when no days in the window are completed", () => {
    // Given: empty history viewed over a 7-day window
    const habit = makeHabit({});

    // When + Then: rate is exactly 0
    expect(completionRate(habit, 7)).toBe(0);
  });

  it("calculates the correct fraction for partial completion", () => {
    // Given: 3 completions spread across a 10-day window
    const history: Habit["history"] = {};
    history[dateAdd(TODAY, -2)] = true;
    history[dateAdd(TODAY, -5)] = true;
    history[dateAdd(TODAY, -9)] = true;
    const habit = makeHabit(history);

    // When + Then: 3 out of 10 = 0.3
    expect(completionRate(habit, 10)).toBe(0.3);
  });

  it("defaults to a 30-day window when no size is provided", () => {
    // Given: 15 completions in the last 30 days
    const history: Habit["history"] = {};
    for (let i = 0; i < 15; i++) {
      history[dateAdd(TODAY, -i)] = true;
    }
    const habit = makeHabit(history);

    // When + Then: default window is 30 days, so rate is 0.5
    expect(completionRate(habit)).toBe(0.5);
  });

  it("counts only days inside the requested window", () => {
    // Given: completions that fall outside a short window
    const history: Habit["history"] = {};
    history[dateAdd(TODAY, -10)] = true;
    history[dateAdd(TODAY, -20)] = true;
    const habit = makeHabit(history);

    // When + Then: a 7-day window should see none of them
    expect(completionRate(habit, 7)).toBe(0);
  });

  it("includes today in the window", () => {
    // Given: only today is checked in
    const habit = makeHabit({ [TODAY]: true });

    // When + Then: a 1-day window is 100% complete
    expect(completionRate(habit, 1)).toBe(1);
  });

  it("computes a 50% rate for an even split in a small window", () => {
    // Given: 2 out of 4 days completed
    const history: Habit["history"] = {};
    history[dateAdd(TODAY, -1)] = true;
    history[dateAdd(TODAY, -3)] = true;
    const habit = makeHabit(history);

    // When + Then: 2 out of 4 = 0.5
    expect(completionRate(habit, 4)).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// Schedule-aware streak behaviour
// ---------------------------------------------------------------------------

