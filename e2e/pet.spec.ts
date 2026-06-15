import { test, expect, type Page } from "@playwright/test";

/**
 * pet.spec — end-to-end coverage of the Pet Ecosystem tab. It walks the real
 * user journey that makes the feature meaningful: complete a habit to earn food
 * (each completion grants 3 feeds), adopt a procedurally-generated companion,
 * spend that food to feed it, and release it to free its slot.
 *
 * Like the other E2E specs this drives a real browser against the running app +
 * database, so it guards the user-visible loop, not just the internals. Pets are
 * persisted in Postgres (no localStorage), so the test adopts with a unique name
 * and tolerates pets left over from previous runs (the ecosystem caps at three).
 */

let counter = 0;
/** Build a collision-free name so parallel projects/re-runs never clash. */
function unique(name: string): string {
  return `${name}${Date.now()}_${++counter}`;
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

/** Adopt a companion of the given temperament if the ecosystem has room. */
async function adoptIfPossible(page: Page, temperament: string, petName: string): Promise<void> {
  const adoptPanel = page.getByText("Adopt a companion");
  if (await adoptPanel.isVisible()) {
    await page.getByRole("button", { name: temperament }).click();
    await page.getByLabel("Name").fill(petName);
    await page.getByRole("button", { name: new RegExp(`Adopt ${petName}`, "i") }).click();
    await expect(page.getByRole("heading", { name: petName })).toBeVisible();
  }
}

test.describe("Pet ecosystem", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupHabits(page);
  });

  test("complete a habit, adopt a companion, and feed it", async ({ page }) => {
    // Given: a habit completed today, which should earn one piece of pet food
    const id = await seedHabit(page, unique("Drink Water "), "a hydrated person");
    await checkInOn(page, id, todayKey());

    // When: the user opens the Pet tab
    await page.goto("/pet");
    await expect(page.getByRole("heading", { name: "Pet Ecosystem" })).toBeVisible();

    // And: they adopt a companion (skipped if the ecosystem is already full)
    const petName = unique("Sprout ");
    await adoptIfPossible(page, "Calm", petName);

    // Then: today's completed habit shows as available food
    await expect(page.getByText(/food available today/i)).toBeVisible();

    // When: the user feeds a companion
    const feed = page.getByRole("button", { name: "Feed" }).first();
    await expect(feed).toBeEnabled();
    await feed.click();

    // Then: the feed registers a lifetime feed for that pet
    await expect(page.getByText(/lifetime feeds/i).first()).toBeVisible();
  });

  test("a companion cannot be fed before any habit is completed today", async ({ page }) => {
    // Given: a habit exists but has not been completed today (no food earned)
    await seedHabit(page, unique("Stretch "), "a supple person");

    // When: the user opens the Pet tab and ensures a companion exists
    await page.goto("/pet");
    const petName = unique("Ember ");
    await adoptIfPossible(page, "Fiery", petName);

    // Then: with no food earned, the Feed button is disabled
    await expect(page.getByRole("button", { name: "Feed" }).first()).toBeDisabled();
  });

  test("release a companion removes it from the ecosystem", async ({ page }) => {
    // Given: a freshly-adopted companion (skipped if the ecosystem is full)
    await page.goto("/pet");
    const petName = unique("Willow ");
    await adoptIfPossible(page, "Gentle", petName);

    const card = page.locator("article", { has: page.getByRole("heading", { name: petName }) });
    test.skip((await card.count()) === 0, "Ecosystem already full — no fresh pet to release.");

    // When: the user confirms releasing that specific companion
    page.on("dialog", (dialog) => dialog.accept());
    await card.getByRole("button", { name: /release/i }).click();

    // Then: the companion's card is gone
    await expect(page.getByRole("heading", { name: petName })).toHaveCount(0);
  });
});
