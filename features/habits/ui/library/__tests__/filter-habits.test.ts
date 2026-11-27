import { describe, expect, it } from "vitest";

import type { Habit } from "@/lib/types";

import { filterHabits, type LibraryQuery } from "../filter-habits";

const TODAY = "2030-01-02"; // a Wednesday

function habit(overrides: Partial<Habit>): Habit {
  return {
    id: "h",
    name: "Read",
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
    identity: "a reader",
    environment: "",
    schedule: "Daily",
    time: "Morning",
    contract: "",
    contractPartners: [],
    history: {},
    notes: [],
    createdAt: "2030-01-01",
    ...overrides,
  };
}

const streaks: Record<string, number> = { a: 1, b: 5, c: 3 };
const rates: Record<string, number> = { a: 0.9, b: 0.1, c: 0.5 };

function query(overrides: Partial<LibraryQuery>): LibraryQuery {
  return {
    filter: "all",
    search: "",
    sort: "streak",
    today: TODAY,
    streak: (h) => streaks[h.id] ?? 0,
    completionRate: (h) => rates[h.id] ?? 0,
    ...overrides,
  };
}

const habits = [
  habit({ id: "a", name: "Read", identity: "a reader", createdAt: "2030-01-01", history: { [TODAY]: { done: true } } as Habit["history"] }),
  habit({ id: "b", name: "Run", identity: "a runner", cue: "after coffee", createdAt: "2030-01-03" }),
  habit({ id: "c", name: "Journal", identity: "a writer", createdAt: "2030-01-02" }),
];

describe("filterHabits", () => {
  it("shows only habits checked in today on the Done tab", () => {
    // Given: one of three habits is done today
    // When: the Done filter is applied
    const result = filterHabits(habits, query({ filter: "done" }));
    // Then: only that habit is listed
    expect(result.map((h) => h.id)).toEqual(["a"]);
  });

  it("searches name, identity and cue case-insensitively", () => {
    // Given / When: searching for a word that only appears in a cue
    const byCue = filterHabits(habits, query({ search: "  COFFEE " }));
    // Then: the habit with that cue is found
    expect(byCue.map((h) => h.id)).toEqual(["b"]);
    // And: identity matches too
    expect(filterHabits(habits, query({ search: "writer" })).map((h) => h.id)).toEqual(["c"]);
  });

  it("sorts by streak, rate, newest and name", () => {
    // Given: habits with different streaks, rates and creation dates
    // When / Then: each sort mode orders them as the user expects
    expect(filterHabits(habits, query({ sort: "streak" })).map((h) => h.id)).toEqual(["b", "c", "a"]);
    expect(filterHabits(habits, query({ sort: "rate" })).map((h) => h.id)).toEqual(["a", "c", "b"]);
    expect(filterHabits(habits, query({ sort: "newest" })).map((h) => h.id)).toEqual(["b", "c", "a"]);
    expect(filterHabits(habits, query({ sort: "name" })).map((h) => h.id)).toEqual(["c", "a", "b"]);
  });

  it("does not mutate the store's habit array", () => {
    // Given: the store's array in its original order
    const before = habits.map((h) => h.id);
    // When: sorting
    filterHabits(habits, query({ sort: "name" }));
    // Then: the original array is untouched
    expect(habits.map((h) => h.id)).toEqual(before);
  });
});
