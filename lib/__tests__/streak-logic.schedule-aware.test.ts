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

