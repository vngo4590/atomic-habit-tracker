import { describe, expect, it } from "vitest";

import type { FormationVerdict, Habit } from "@/lib/types";

import { dailyCompletion, rangeKeys, rangeTotals, totalCheckIns, weekdayRates } from "../analytics-data";
import { daysSince, groupForFormation } from "../formation";

const habit = (id: string, patch: Partial<Habit> = {}) =>
  ({ id, name: id, schedule: "Daily", history: {}, createdAt: "2030-01-01", ...patch }) as Habit;

describe("analytics data", () => {
  it("builds an oldest-first window of date keys ending today", () => {
    // Given / When: a 3-day window ending 10 Jan 2030
    // Then: the keys run 8 → 10 Jan
    expect(rangeKeys("2030-01-10", 3)).toEqual(["2030-01-08", "2030-01-09", "2030-01-10"]);
  });

  it("computes daily and range completion from scheduled habit-days", () => {
    // Given: two daily habits, one done on both days, one on the second only
    const habits = [
      habit("a", { history: { "2030-01-09": true, "2030-01-10": true } }),
      habit("b", { history: { "2030-01-10": true } }),
    ];

    // When: the 2-day window is summarised
    const points = dailyCompletion(habits, ["2030-01-09", "2030-01-10"]);

    // Then: 50% then 100%, 3 of 4 overall
    expect(points.map((point) => point.pct)).toEqual([50, 100]);
    expect(rangeTotals(points)).toEqual({ done: 3, scheduled: 4, pct: 75 });
  });

  it("buckets weekday completion Monday-first and counts all-time check-ins", () => {
    // Given: a habit done on Monday 7 Jan 2030 but not Tuesday 8 Jan
    const habits = [habit("a", { history: { "2030-01-07": true, "2030-01-08": false } })];

    // When: the two days are bucketed
    const rates = weekdayRates(habits, ["2030-01-07", "2030-01-08"]);

    // Then: Monday 100%, Tuesday 0%, other days have no data; false entries are not check-ins
    expect(rates[0]).toEqual({ label: "Mon", pct: 100, total: 1 });
    expect(rates[1]).toEqual({ label: "Tue", pct: 0, total: 1 });
    expect(rates.slice(2).every((rate) => rate.total === 0)).toBe(true);
    expect(totalCheckIns(habits)).toBe(1);
  });
});

describe("formation grouping", () => {
  it("counts whole calendar days even across a daylight-saving change", () => {
    // Given / When / Then: spans that cross DST still count calendar days
    expect(daysSince("2030-03-01", "2030-04-01")).toBe(31);
    expect(daysSince("2030-10-01", "2030-11-15")).toBe(45);
    expect(daysSince("2030-02-01", "2030-01-01")).toBe(0);
  });

  it("separates ready, in-progress and inducted habits", () => {
    // Given: an old unreviewed habit, a young one, and a formed + an unformed verdict
    const habits = [
      habit("old", { createdAt: "2030-01-01" }),
      habit("young", { createdAt: "2030-03-01" }),
      habit("formed", { createdAt: "2029-01-01" }),
      habit("notYet", { createdAt: "2029-01-01" }),
    ];
    const verdicts = [
      { habitId: "formed", formed: true, score: 5 },
      { habitId: "notYet", formed: false, score: 1 },
    ] as FormationVerdict[];

    // When: grouped on 1 Apr 2030
    const groups = groupForFormation(habits, verdicts, "2030-04-01");

    // Then: reviewed habits are not re-prompted; "keep practicing" stays in progress
    expect(groups.ready.map((item) => item.id)).toEqual(["old"]);
    expect(groups.inProgress.map((item) => item.id)).toEqual(["notYet", "young"]);
    expect(groups.inducted.map((item) => item.habit.id)).toEqual(["formed"]);
  });
});
