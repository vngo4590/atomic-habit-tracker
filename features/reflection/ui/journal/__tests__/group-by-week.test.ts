import { describe, expect, it } from "vitest";

import { groupByWeek, weekLabel, weekStartOf } from "../group-by-week";

describe("journal week grouping", () => {
  it("treats Monday as the start of the week", () => {
    // Given: a Wednesday, a Sunday and a Monday in January 2030 (Jan 7 is a Monday)
    // When: each is mapped to its week start
    // Then: all of them land on the preceding (or same) Monday
    expect(weekStartOf("2030-01-09")).toBe("2030-01-07");
    expect(weekStartOf("2030-01-13")).toBe("2030-01-07");
    expect(weekStartOf("2030-01-07")).toBe("2030-01-07");
  });

  it("labels the current and previous week in plain words", () => {
    // Given: today is Thursday 10 Jan 2030
    const today = "2030-01-10";

    // When / Then: this week and last week read naturally; older weeks show a date
    expect(weekLabel("2030-01-07", today)).toBe("This week");
    expect(weekLabel("2029-12-31", today)).toBe("Last week");
    expect(weekLabel("2029-12-24", today)).toMatch(/^Week of /);
  });

  it("buckets newest-first entries into week groups without reordering them", () => {
    // Given: four entries spanning three weeks, newest first
    const entries = [
      { id: "a", date: "2030-01-10" },
      { id: "b", date: "2030-01-07" },
      { id: "c", date: "2030-01-02" },
      { id: "d", date: "2029-12-20" },
    ];

    // When: they are grouped relative to 10 Jan 2030
    const groups = groupByWeek(entries, "2030-01-10");

    // Then: three groups come out, newest week first, with entry order preserved
    expect(groups.map((group) => group.label.startsWith("Week of") ? "older" : group.label)).toEqual([
      "This week",
      "Last week",
      "older",
    ]);
    expect(groups.map((group) => group.items.map((item) => item.id))).toEqual([["a", "b"], ["c"], ["d"]]);
  });

  it("returns no groups for an empty journal", () => {
    // Given / When / Then: nothing to group yields an empty list
    expect(groupByWeek([], "2030-01-10")).toEqual([]);
  });
});
