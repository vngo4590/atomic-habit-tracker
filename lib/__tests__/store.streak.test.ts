import { describe, expect, it, vi } from "vitest";

import { dateAdd, todayKey } from "@/lib/helpers";
import { completionRate, longestStreak, streak } from "@/lib/store";
import type { Habit } from "@/lib/types";

import { makeStoreTestHabit as makeHabit } from "./_store-test-helpers";

// Pin today to a Wednesday so schedule-aware streak tests are deterministic.
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

  it("skips unscheduled days when computing streak", () => {
    const today = todayKey();
    const habit = makeHabit({
      [dateAdd(today, -2)]: true,
      [today]: true,
    });
    habit.schedule = "Mon, Wed";

    expect(streak(habit)).toBe(2);
  });

  it("counts bonus days toward schedule-aware completion rate", () => {
    const today = todayKey();
    const habit = makeHabit({
      [today]: true,
      [dateAdd(today, -2)]: true,
      [dateAdd(today, -4)]: true,
    });
    habit.schedule = "Mon, Wed";

    expect(completionRate(habit, 7)).toBe(1.5);
  });
});

