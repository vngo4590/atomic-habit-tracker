import { describe, expect, it, vi } from "vitest";

import { dateAdd, todayKey } from "@/lib/helpers";
import { completionRate, longestStreak, streak } from "@/lib/store";
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
    stackAfterId: null,
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
describe("schedule-aware streak — unscheduled days do not break the streak", () => {
  it("continues streak across an unscheduled gap", () => {
    // Given: Mon/Wed schedule, done on both Mon and Wed with Tue unscheduled
    const habit = makeHabit({
      [dateAdd(TODAY, -2)]: true, // Mon
      [TODAY]: true,              // Wed (today)
    });
    habit.schedule = "Mon, Wed";

    // When + Then: streak is 2 because the unscheduled gap on Tue is skipped
    expect(streak(habit)).toBe(2);
  });

  it("anchors to the most recent scheduled completion when today is missed", () => {
    // Given: Mon/Wed schedule, done on Mon but missed Wed (today)
    const habit = makeHabit({
      [dateAdd(TODAY, -2)]: true, // Mon
    });
    habit.schedule = "Mon, Wed";

    // When + Then: streak is 1 because Mon was completed on schedule and the
    // unscheduled Tue in between is skipped (today is scheduled and missed, so
    // we anchor backward and find Mon).
    expect(streak(habit)).toBe(1);
  });

  it("counts bonus completions on unscheduled days toward the streak", () => {
    // Given: Mon/Wed schedule, bonus done on Tue between Mon and Wed
    const habit = makeHabit({
      [dateAdd(TODAY, -2)]: true, // Mon
      [dateAdd(TODAY, -1)]: true, // Tue (bonus)
      [TODAY]: true,              // Wed
    });
    habit.schedule = "Mon, Wed";

    // When + Then: streak is 3 — the bonus day counts too
    expect(streak(habit)).toBe(3);
  });

  it("preserves the anchor-to-yesterday behaviour for daily habits", () => {
    // Given: daily habit, not done today, but done yesterday and day before
    const habit = makeHabit({
      [dateAdd(TODAY, -1)]: true,
      [dateAdd(TODAY, -2)]: true,
    });

    // When + Then: streak is 2 (yesterday + day before)
    expect(streak(habit)).toBe(2);
  });
});

describe("schedule-aware longestStreak — gaps of unscheduled days are ignored", () => {
  it("continues across unscheduled gaps between done dates", () => {
    // Given: Mon/Wed/Fri schedule with done dates Mon (Jan 7) and Wed (Jan 9)
    // Jan 1 2030 is a Tuesday, so Jan 7 = Monday and Jan 9 = Wednesday.
    const habit = makeHabit({
      "2030-01-07": true, // Mon
      "2030-01-09": true, // Wed
    });
    habit.schedule = "Mon, Wed, Fri";

    // When + Then: streak is 2 because Tue (Jan 8) gap is unscheduled
    expect(longestStreak(habit)).toBe(2);
  });

  it("breaks when a scheduled day in the gap was missed", () => {
    // Given: Mon/Wed schedule with done on Mon and next Mon, missing Wed
    const habit = makeHabit({
      "2030-01-06": true, // Mon
      "2030-01-13": true, // next Mon
    });
    habit.schedule = "Mon, Wed";

    // When + Then: streak is 1 because Wed in between was scheduled and missed
    expect(longestStreak(habit)).toBe(1);
  });
});

describe("schedule-aware completionRate — denominator is scheduled days", () => {
  it("returns 1.0 when all scheduled days in the window are completed", () => {
    // Given: Mon/Wed schedule, both scheduled days in a 7-day window are done
    const history: Habit["history"] = {};
    history[dateAdd(TODAY, -2)] = true; // Mon
    history[TODAY] = true;              // Wed
    const habit = makeHabit(history);
    habit.schedule = "Mon, Wed";

    // When + Then: 2 done / 2 scheduled = 1.0
    expect(completionRate(habit, 7)).toBe(1);
  });

  it("returns above 1.0 for bonus completions on unscheduled days", () => {
    // Given: Mon/Wed schedule, done on Mon, Wed, and bonus on Fri
    const history: Habit["history"] = {};
    history[dateAdd(TODAY, -4)] = true; // Mon
    history[dateAdd(TODAY, -2)] = true; // Wed
    history[dateAdd(TODAY, -0)] = true; // Fri (bonus)
    const habit = makeHabit(history);
    habit.schedule = "Mon, Wed";

    // When + Then: 3 done / 2 scheduled = 1.5
    expect(completionRate(habit, 7)).toBe(1.5);
  });

  it("falls back to calendar days for free-text schedules", () => {
    // Given: free-text schedule, 3 completions in 7 days
    const history: Habit["history"] = {};
    history[dateAdd(TODAY, -1)] = true;
    history[dateAdd(TODAY, -3)] = true;
    history[dateAdd(TODAY, -5)] = true;
    const habit = makeHabit(history);
    habit.schedule = "After lunch";

    // When + Then: falls back to 3 / 7
    expect(completionRate(habit, 7)).toBeCloseTo(3 / 7);
  });
});
