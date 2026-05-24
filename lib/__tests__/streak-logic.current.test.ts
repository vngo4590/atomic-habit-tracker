import { describe, expect, it, vi } from "vitest";

import { dateAdd, todayKey } from "@/lib/helpers";
import { streak } from "@/lib/store";
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

describe("current streak — includes today when checked in", () => {
  it("counts consecutive days ending today", () => {
    // Given: a habit checked in today and the previous 4 days (5 total)
    const habit = makeHabit({
      [TODAY]: true,
      [dateAdd(TODAY, -1)]: true,
      [dateAdd(TODAY, -2)]: true,
      [dateAdd(TODAY, -3)]: true,
      [dateAdd(TODAY, -4)]: true,
    });

    // When + Then: streak counts all 5 days including today
    expect(streak(habit)).toBe(5);
  });

  it("returns 1 when only today is checked in", () => {
    // Given: exactly one check-in, and it is today
    const habit = makeHabit({ [TODAY]: true });

    // When + Then: streak is 1
    expect(streak(habit)).toBe(1);
  });
});

describe("current streak — ends yesterday when not checked in today", () => {
  it("counts consecutive days ending yesterday when today is missed", () => {
    // Given: a habit checked in yesterday and two days before, but not today
    const habit = makeHabit({
      [dateAdd(TODAY, -1)]: true,
      [dateAdd(TODAY, -2)]: true,
      [dateAdd(TODAY, -3)]: true,
    });

    // When + Then: streak is 3 (yesterday + 2 prior days)
    expect(streak(habit)).toBe(3);
  });

  it("returns 1 when only yesterday is checked in", () => {
    // Given: a single check-in that happened yesterday
    const habit = makeHabit({ [dateAdd(TODAY, -1)]: true });

    // When + Then: streak is 1
    expect(streak(habit)).toBe(1);
  });

  it("returns 0 when today is missed and the last check-in was two days ago", () => {
    // Given: last check-in was two days ago, missing both yesterday and today
    const habit = makeHabit({
      [dateAdd(TODAY, -2)]: true,
    });

    // When + Then: streak is 0 because any gap breaks the streak
    expect(streak(habit)).toBe(0);
  });
});

describe("current streak — gaps break the streak", () => {
  it("returns 0 for empty history", () => {
    // Given: a brand-new habit with no check-ins
    const habit = makeHabit({});

    // When + Then: streak is 0
    expect(streak(habit)).toBe(0);
  });

  it("breaks streak on a gap of exactly one day", () => {
    // Given: checked in 3 days ago but missed yesterday and today
    const habit = makeHabit({
      [dateAdd(TODAY, -3)]: true,
      [dateAdd(TODAY, -4)]: true,
    });

    // When + Then: streak is 0 — a single missed day is enough to break it
    expect(streak(habit)).toBe(0);
  });

  it("breaks streak on a gap of many days", () => {
    // Given: a long-ago streak with a large gap before today
    const habit = makeHabit({
      [dateAdd(TODAY, -10)]: true,
      [dateAdd(TODAY, -11)]: true,
      [dateAdd(TODAY, -12)]: true,
    });

    // When + Then: streak is 0 because the gap is too large
    expect(streak(habit)).toBe(0);
  });
});

describe("current streak — check-in object edge cases", () => {
  it("counts streaks with full CheckIn objects (mood/journal)", () => {
    // Given: a habit using CheckIn objects instead of boolean true
    const habit = makeHabit({
      [TODAY]: { done: true, mood: 5 },
      [dateAdd(TODAY, -1)]: { done: true, mood: 4 },
      [dateAdd(TODAY, -2)]: { done: true, mood: 3 },
    });

    // When + Then: all three days count toward the streak
    expect(streak(habit)).toBe(3);
  });

  it("does not count a day when the history value is falsy", () => {
    // Given: a history entry that is explicitly false
    const habit = makeHabit({
      [TODAY]: true,
      [dateAdd(TODAY, -1)]: false,
      [dateAdd(TODAY, -2)]: true,
    });

    // When + Then: streak stops at the false value, so only today counts
    expect(streak(habit)).toBe(1);
  });
});


