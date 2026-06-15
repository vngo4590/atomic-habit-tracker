import { describe, expect, it } from "vitest";

import { earnedFoodFrom, FOOD_PER_HABIT, FOOD_PER_JOURNAL } from "@/lib/pet/food";

/**
 * Food is the bridge between doing habits/journalling and feeding pets. These
 * tests pin the reward economy so it can't drift silently: habits are the primary
 * loop and reflective activities are a gentle bonus.
 */
describe("earnedFoodFrom", () => {
  it("awards FOOD_PER_HABIT for each completed habit", () => {
    // Given two completed habits and no journalling; Then food = 2 * FOOD_PER_HABIT
    expect(earnedFoodFrom({ habitsCompleted: 2, journalEntries: 0, habitJournals: 0, weeklyReviews: 0 }))
      .toBe(2 * FOOD_PER_HABIT);
  });

  it("awards FOOD_PER_JOURNAL for every reflective activity", () => {
    // Given one of each journalling source; Then food = 3 * FOOD_PER_JOURNAL
    expect(earnedFoodFrom({ habitsCompleted: 0, journalEntries: 1, habitJournals: 1, weeklyReviews: 1 }))
      .toBe(3 * FOOD_PER_JOURNAL);
  });

  it("sums habit and journalling food together", () => {
    // Given mixed activity; Then both sources contribute
    expect(earnedFoodFrom({ habitsCompleted: 1, journalEntries: 2, habitJournals: 0, weeklyReviews: 0 }))
      .toBe(FOOD_PER_HABIT + 2 * FOOD_PER_JOURNAL);
  });

  it("is zero when nothing was done", () => {
    expect(earnedFoodFrom({ habitsCompleted: 0, journalEntries: 0, habitJournals: 0, weeklyReviews: 0 })).toBe(0);
  });

  it("sets the headline feed power: completing a habit grants 3 feeds", () => {
    expect(FOOD_PER_HABIT).toBe(3);
  });
});
