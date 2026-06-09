import { test, expect, type Page } from "@playwright/test";

/**
 * pet.spec — end-to-end coverage of the Pet Companion tab. It walks the real
 * user journey that makes the feature meaningful: complete a habit, then spend
 * the food that completion earned to feed your adopted pixel companion.
 *
 * Like the other E2E specs this drives a real browser against the running app +
 * database, so it guards the user-visible loop, not just the internals.
 */

let counter = 0;
/** Build a collision-free habit name so parallel projects never clash. */
function unique(name: string): string {
  return `${name} ${Date.now()}_${++counter}`;
}

/** YYYY-MM-DD date key for today in the browser's local zone. */
function todayKey(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Remove every habit owned by the signed-in user so each test starts clean. */
async function cleanupHabits(page: Page): Promise<void> {
  const listRes = await page.request.get("/api/v1/habits");
  if (!listRes.ok()) return;
  const body = await listRes.json();
  const habits: Array<{ id: string }> = body.data?.habits ?? [];
  for (const habit of habits) {
    await page.request.delete(`/api/v1/habits/${habit.id}`);
  }
}

/** Create a habit straight through the API to set up state for a test. */
async function seedHabit(page: Page, name: string, identity: string): Promise<string> {
  const response = await page.request.post("/api/v1/habits", {
    data: {
      name,
      identity,
      emoji: "•",
      cue: "",
      craving: "",
      response: name,
      reward: "",
      loopCue: "",
      loopCraving: "",
      loopResponse: name,
      loopReward: "",
      twoMin: "",
      environment: "",
      schedule: "Daily",
      time: "Morning",
      contract: "",
      contractPartners: [],
    },
  });
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return body.data.habit.id as string;
}

/** Record a check-in for a habit on a specific day. */
async function checkInOn(page: Page, habitId: string, dateKey: string): Promise<void> {
  const response = await page.request.post(`/api/v1/habits/${habitId}/check-ins`, {
    data: { dateKey, done: true },
  });
  expect(response.ok()).toBe(true);
}

/** Clear the browser-mirrored pet state so each test starts un-adopted. */
async function resetPetStorage(page: Page): Promise<void> {
  await page.goto("/pet");
  await page.evaluate(() => window.localStorage.removeItem("atomicly:pet"));
}

test.describe("Feeding the pet companion", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupHabits(page);
    await resetPetStorage(page);
  });

  test("completing a habit lets you adopt and feed a pixel companion", async ({ page }) => {
    // Given: a habit completed today, which should earn one piece of pet food
    const id = await seedHabit(page, unique("Drink Water"), "a hydrated person");
    await checkInOn(page, id, todayKey());

    // When: the user opens the Pet tab (fresh storage -> adoption picker)
    await page.goto("/pet");
    await expect(page.getByText("Choose your companion")).toBeVisible();

    // And: they adopt a companion
    await page.getByRole("button", { name: /Adopt Sprout/i }).click();

    // Then: the pet appears hungry with its satiety bar empty
    await expect(page.getByRole("heading", { name: "Sprout" })).toBeVisible();
    await expect(page.getByText("Hungry")).toBeVisible();
    await expect(page.getByText("Satiety 0 / 5")).toBeVisible();

    // And: the completed habit shows up as one available piece of food
    const stats = page.locator(".card", { hasText: "Today" });
    await expect(stats.locator("li", { hasText: "Food available" })).toContainText("1");

    // When: they feed the companion
    const feed = page.getByRole("button", { name: /Feed your companion/i });
    await expect(feed).toBeEnabled();
    await feed.click();

    // Then: satiety rises and the food token is spent
    await expect(page.getByText("Satiety 1 / 5")).toBeVisible();
    await expect(stats.locator("li", { hasText: "Fed today" })).toContainText("1");
    await expect(stats.locator("li", { hasText: "Food available" })).toContainText("0");

    // And: with no food left, the feed button reverts to the earn-food prompt
    await expect(
      page.getByRole("button", { name: /Complete a habit to earn food/i }),
    ).toBeDisabled();
  });

  test("a pet cannot be fed before any habit is completed today", async ({ page }) => {
    // Given: a habit exists but has not been completed today (no food earned)
    await seedHabit(page, unique("Stretch"), "a supple person");

    // When: the user adopts a companion on the Pet tab
    await page.goto("/pet");
    await page.getByRole("button", { name: /Adopt Ember/i }).click();

    // Then: feeding is disabled and the UI nudges them to complete a habit first
    await expect(
      page.getByRole("button", { name: /Complete a habit to earn food/i }),
    ).toBeDisabled();
    await expect(page.getByText("Satiety 0 / 5")).toBeVisible();
  });
});
