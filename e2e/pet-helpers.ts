import { expect, type Page } from "@playwright/test";

/**
 * Shared end-to-end helpers for the Pet Ecosystem specs. Pets live in Postgres
 * (no localStorage) and the dev user + database are shared across every test and
 * project, so these helpers let each test start from a known-clean slate and
 * drive the real UI / API the way a user would. They are deliberately resilient
 * to the app's optimistic cache and to client hydration timing.
 */

let counter = 0;

/** Build a collision-free name so parallel projects / re-runs never clash. */
export function unique(name: string): string {
  return `${name}${Date.now()}_${++counter}`;
}

/** YYYY-MM-DD date key for today in the browser's local zone. */
export function todayKey(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Remove every habit owned by the signed-in user so each test starts with a
 * predictable food economy. Deleting a habit cascades its check-ins, which zeroes
 * out the "earned food today" the pet feature derives from completed habits.
 */
export async function cleanupHabits(page: Page): Promise<void> {
  const listRes = await page.request.get("/api/v1/habits");
  if (!listRes.ok()) return;
  const body = await listRes.json();
  const habits: Array<{ id: string }> = body.data?.habits ?? [];
  for (const habit of habits) {
    await page.request.delete(`/api/v1/habits/${habit.id}`);
  }
}

/** Create a habit straight through the API to set up state for a test. */
export async function seedHabit(page: Page, name: string, identity: string): Promise<string> {
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

/** Record a check-in for a habit on a specific day (earns 3 pet food). */
export async function checkInOn(page: Page, habitId: string, dateKey: string): Promise<void> {
  const response = await page.request.post(`/api/v1/habits/${habitId}/check-ins`, {
    data: { dateKey, done: true },
  });
  expect(response.ok()).toBe(true);
}

/**
 * Release every pet currently in the ecosystem through the UI so the test starts
 * from zero alive pets and a free monthly slot. There is no pets REST endpoint,
 * so we drive the real "Release" / "Lay to rest" buttons and auto-accept the
 * confirmation dialog.
 *
 * Two app behaviours make this tricky, so the helper guards against both:
 *  - The pet cards are rendered by the client store *after* hydration; until the
 *    clock ticks the page shows a "Waking your companions…" placeholder. A bare
 *    count() does not auto-wait, so we first wait for a definitive hydrated
 *    signal (empty-state text OR a Release button) before counting.
 *  - Deletes go through an optimistic cache. Each loop iteration reloads /pet to
 *    read server-committed truth, so a reverted delete reappears and is retried,
 *    and the previous delete is guaranteed to have committed before we adopt.
 */
export async function releaseAllPets(page: Page): Promise<void> {
  // Confirm dialogs (releasing a living pet asks "are you sure?") are auto-accepted.
  page.on("dialog", (dialog) => dialog.accept());

  for (let guard = 0; guard < 12; guard += 1) {
    await page.goto("/pet");
    await expect(page.getByRole("heading", { name: "Pet Ecosystem" })).toBeVisible();
    const removable = page.getByRole("button", { name: /^release$|lay to rest/i });
    await expect(
      page.getByText("Your ecosystem is empty").or(removable.first()),
    ).toBeVisible();
    const count = await removable.count();
    if (count === 0) return;
    await removable.first().click();
    // Wait for the card to detach optimistically, then let the delete server
    // action settle before the next reload reads committed state.
    await expect(removable).toHaveCount(count - 1);
    await page.waitForLoadState("networkidle");
  }
  throw new Error("releaseAllPets: pets still present after 12 release attempts");
}

/** Adopt a companion that MUST succeed, asserting its card appears. */
export async function adoptPet(page: Page, temperament: string, petName: string): Promise<void> {
  await expect(page.getByText("Adopt a companion", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: temperament }).click();
  await page.getByLabel("Name").fill(petName);
  await page.getByRole("button", { name: new RegExp(`Adopt ${petName}`, "i") }).click();
  await expect(page.getByRole("heading", { name: petName })).toBeVisible();
}
