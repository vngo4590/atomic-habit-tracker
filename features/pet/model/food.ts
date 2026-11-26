/**
 * food.ts — how completing habits and journalling turns into pet food.
 *
 * Plain-language summary:
 *   Food is the bridge between the habit tracker and the pet ecosystem. Each day
 *   the user earns a shared pool of food by showing up: every completed habit is
 *   worth the most, and every act of reflection (a Journal entry, a habit's own
 *   journal note, or a weekly review) earns a little extra. That food is then
 *   spent feeding pets. Keeping the maths in one pure place means the client
 *   (optimistic display) and the server (authoritative spend) always agree.
 */

/** Food earned per habit completed today — the primary, highest-value loop. */
export const FOOD_PER_HABIT = 3;

/** Food earned per journalling activity (Journal entry, habit note, weekly review). */
export const FOOD_PER_JOURNAL = 1;

/** The raw counts of today's food-earning activities. */
export interface FoodSourceCounts {
  /** Habits checked off today. */
  habitsCompleted: number;
  /** Journal-tab entries written today. */
  journalEntries: number;
  /** Habit check-ins that carry a journal note today. */
  habitJournals: number;
  /** Weekly reviews saved/updated today. */
  weeklyReviews: number;
}

/**
 * Total food earned today from all sources. Habits are worth FOOD_PER_HABIT each;
 * every reflective activity is worth FOOD_PER_JOURNAL. This is the "earned" half
 * of the shared pool — the "spent" half is the sum of PetFeedLog amounts.
 */
export function earnedFoodFrom(counts: FoodSourceCounts): number {
  const reflections = counts.journalEntries + counts.habitJournals + counts.weeklyReviews;
  return counts.habitsCompleted * FOOD_PER_HABIT + reflections * FOOD_PER_JOURNAL;
}
