import { describe, expect, it } from "vitest";

import {
  MAX_ACTIVE_HABITS,
  activeHabitCount,
  isInductedHabit,
  remainingHabitSlots,
} from "@/lib/habit-cap";
import { testFormationVerdict, testHabit } from "@/lib/test/fixtures";

// ---------------------------------------------------------------------------
// isInductedHabit — the client-side "is this habit in the Hall of Fame?" check
// ---------------------------------------------------------------------------
describe("isInductedHabit", () => {
  it("returns true when the habit has a formed verdict", () => {
    // Given: a formed verdict for the habit
    const verdicts = [testFormationVerdict({ habitId: "h1", formed: true })];

    // When/Then: the habit is inducted
    expect(isInductedHabit("h1", verdicts)).toBe(true);
  });

  it("returns false when the habit's verdict is a non-formed (keep practicing) one", () => {
    // Given: a verdict that did not induct the habit
    const verdicts = [testFormationVerdict({ habitId: "h1", formed: false })];

    // When/Then: the habit is not inducted, so it still counts as active
    expect(isInductedHabit("h1", verdicts)).toBe(false);
  });

  it("returns false when there is no verdict for the habit", () => {
    // Given: a verdict for a *different* habit only
    const verdicts = [testFormationVerdict({ habitId: "other", formed: true })];

    // When/Then: the target habit has no verdict of its own
    expect(isInductedHabit("h1", verdicts)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// activeHabitCount — how many habits count against the cap
// ---------------------------------------------------------------------------
describe("activeHabitCount", () => {
  it("counts every habit as active when there are no verdicts", () => {
    // Given: three habits and no formation verdicts
    const habits = [testHabit({ id: "h1" }), testHabit({ id: "h2" }), testHabit({ id: "h3" })];

    // When/Then: all three are active
    expect(activeHabitCount(habits, [])).toBe(3);
  });

  it("excludes an inducted (formed) habit from the active count", () => {
    // Given: three habits where one is inducted
    const habits = [testHabit({ id: "h1" }), testHabit({ id: "h2" }), testHabit({ id: "h3" })];
    const verdicts = [testFormationVerdict({ habitId: "h2", formed: true })];

    // When/Then: only two habits remain active — inducting frees a slot
    expect(activeHabitCount(habits, verdicts)).toBe(2);
  });

  it("still counts a habit whose verdict is 'keep practicing'", () => {
    // Given: a habit reviewed but not formed
    const habits = [testHabit({ id: "h1" }), testHabit({ id: "h2" })];
    const verdicts = [testFormationVerdict({ habitId: "h1", formed: false })];

    // When/Then: a non-formed verdict does not free a slot
    expect(activeHabitCount(habits, verdicts)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// remainingHabitSlots — drives the new-habit page's disabled state
// ---------------------------------------------------------------------------
describe("remainingHabitSlots", () => {
  it("reports the full allowance when the user has no habits", () => {
    // Given: no habits at all
    // When/Then: the user may create up to the maximum
    expect(remainingHabitSlots([], [])).toBe(MAX_ACTIVE_HABITS);
  });

  it("reports zero remaining when the user is at the cap", () => {
    // Given: exactly MAX_ACTIVE_HABITS active habits
    const habits = Array.from({ length: MAX_ACTIVE_HABITS }, (_, i) => testHabit({ id: `h${i}` }));

    // When/Then: no slots remain
    expect(remainingHabitSlots(habits, [])).toBe(0);
  });

  it("never returns a negative number when the user is above the cap (grandfathered data)", () => {
    // Given: more active habits than the cap allows (pre-existing data)
    const habits = Array.from({ length: MAX_ACTIVE_HABITS + 2 }, (_, i) =>
      testHabit({ id: `h${i}` }),
    );

    // When/Then: remaining is clamped to zero, never negative
    expect(remainingHabitSlots(habits, [])).toBe(0);
  });

  it("frees a slot when a habit is inducted", () => {
    // Given: a user at the cap where one habit then gets inducted
    const habits = Array.from({ length: MAX_ACTIVE_HABITS }, (_, i) => testHabit({ id: `h${i}` }));
    const verdicts = [testFormationVerdict({ habitId: "h0", formed: true })];

    // When/Then: exactly one slot opens up
    expect(remainingHabitSlots(habits, verdicts)).toBe(1);
  });
});
