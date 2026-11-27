import { describe, expect, it } from "vitest";

import type { Habit } from "@/lib/types";

import {
  buildTodayItems,
  greetingFor,
  nextScheduledHabit,
  recentDays,
  searchHabits,
  votesByIdentity,
} from "../today-model";

function habit(patch: Partial<Habit> & { id: string }): Habit {
  return {
    name: `Habit ${patch.id}`,
    emoji: "",
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
    stackNextId: null,
    contract: "",
    contractPartners: [],
    history: {},
    notes: [],
    createdAt: "2030-01-01",
    ...patch,
  };
}

// 2026-05-18 is a Monday.
const MONDAY = "2026-05-18";

describe("buildTodayItems", () => {
  it("renders solo habits as single rows and each chain only once", () => {
    // Given: a chain a -> b (both undone) and a solo habit s
    const a = habit({ id: "a", stackNextId: "b" });
    const b = habit({ id: "b" });
    const s = habit({ id: "s" });
    const all = [a, b, s];

    // When: today's items are built from the undone habits
    const items = buildTodayItems(all, all, MONDAY);

    // Then: the chain appears once (headed by a) and the solo habit once
    expect(items).toEqual([
      { kind: "stack", rootId: "a", visible: a },
      { kind: "solo", habit: s },
    ]);
  });

  it("heads a chain with its first undone link when earlier links are done", () => {
    // Given: a -> b where a is already done today
    const a = habit({ id: "a", stackNextId: "b", history: { [MONDAY]: true } });
    const b = habit({ id: "b" });

    // When: only b is still undone
    const items = buildTodayItems([b], [a, b], MONDAY);

    // Then: the chain is shown starting at b
    expect(items).toEqual([{ kind: "stack", rootId: "a", visible: b }]);
  });
});

describe("recentDays", () => {
  it("returns oldest-first daily tallies ending today", () => {
    // Given: one daily habit done today and yesterday
    const h = habit({ id: "h", history: { [MONDAY]: true, "2026-05-17": true } });

    // When: the last 3 days are tallied
    const days = recentDays([h], MONDAY, 3);

    // Then: each day reports done/total for scheduled habits
    expect(days).toEqual([
      { key: "2026-05-16", done: 0, total: 1 },
      { key: "2026-05-17", done: 1, total: 1 },
      { key: MONDAY, done: 1, total: 1 },
    ]);
  });
});

describe("votesByIdentity", () => {
  it("tallies only habits scheduled and done today", () => {
    // Given: two reader habits done, one weekend habit done on a Monday
    const habits = [
      habit({ id: "1", identity: "reader", history: { [MONDAY]: true } }),
      habit({ id: "2", identity: "reader", history: { [MONDAY]: true } }),
      habit({ id: "3", identity: "relaxer", schedule: "Weekends", history: { [MONDAY]: true } }),
      habit({ id: "4", identity: "runner" }),
    ];

    // Then: only the scheduled, completed votes count
    expect(votesByIdentity(habits, MONDAY)).toEqual([["reader", 2]]);
  });
});

describe("nextScheduledHabit", () => {
  it("finds the soonest upcoming habit and skips free-text schedules", () => {
    // Given: a weekend habit (next: Saturday), a weekday habit (next:
    // Tuesday) and a free-text habit (no computable next day)
    const weekend = habit({ id: "w", schedule: "Weekends" });
    const weekday = habit({ id: "d", schedule: "Weekdays" });
    const freeText = habit({ id: "f", schedule: "whenever I feel like it" });

    // Then: Tuesday's weekday habit wins
    expect(nextScheduledHabit([weekend, freeText, weekday], MONDAY)).toEqual({
      habit: weekday,
      dateKey: "2026-05-19",
    });
    expect(nextScheduledHabit([freeText], MONDAY)).toBeNull();
  });
});

describe("greetingFor", () => {
  it("maps the hour to a time-of-day greeting", () => {
    expect(greetingFor(3)).toBe("Late night");
    expect(greetingFor(8)).toBe("Good morning");
    expect(greetingFor(14)).toBe("Good afternoon");
    expect(greetingFor(21)).toBe("Good evening");
  });
});

describe("searchHabits", () => {
  it("matches name, identity or cue case-insensitively and ignores blank queries", () => {
    const habits = [
      habit({ id: "1", name: "Read" }),
      habit({ id: "2", name: "Run", identity: "Athlete" }),
      habit({ id: "3", name: "Floss", cue: "After brushing" }),
    ];

    expect(searchHabits(habits, "read").map((h) => h.id)).toEqual(["1"]);
    expect(searchHabits(habits, "ATHLETE").map((h) => h.id)).toEqual(["2"]);
    expect(searchHabits(habits, "brush").map((h) => h.id)).toEqual(["3"]);
    expect(searchHabits(habits, "   ")).toEqual([]);
  });
});
