import { test, expect } from "@playwright/test";
import {
  adoptPet,
  checkInOn,
  cleanupHabits,
  releaseAllPets,
  seedHabit,
  todayKey,
  unique,
} from "./pet-helpers";

/**
 * pet-adoption.spec — end-to-end coverage for the pet adoption + feeding fixes.
 *
 * It guards three user-visible behaviours against a real browser + database:
 *   1. Releasing a pet immediately frees this month's adoption slot, so a user
 *      can adopt a new companion right after releasing one (the reported bug:
 *      "after deleting a pet I still had to wait").
 *   2. When a second adoption is refused by the one-per-month rule, the real
 *      reason is shown in a toast — not a blank production error digest.
 *   3. The happy path: completing a habit earns food, feeding a companion
 *      records a lifetime feed, and that feed persists across a reload (the
 *      fullness no longer snaps back to empty).
 *
 * Pets live in Postgres (no localStorage) and the ecosystem caps at three alive
 * pets AND one *living* adoption per calendar month. Because the dev user and
 * database are shared across tests/projects, every test starts by releasing all
 * existing pets through the UI (there is no pets REST endpoint) so it runs from a
 * known-clean slate, and adopts with collision-free names. Shared helpers live
 * in ./pet-helpers.
 */

test.describe("Pet adoption + feeding", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupHabits(page);
    await releaseAllPets(page);
  });

  test("releasing a pet frees this month's slot so a new one can be adopted immediately", async ({ page }) => {
    // Given: the user adopts a companion this month
    const first = unique("Pebble ");
    await adoptPet(page, "Calm", first);

    // When: they release that companion
    const firstCard = page.locator("article", { has: page.getByRole("heading", { name: first }) });
    await firstCard.getByRole("button", { name: /^release$/i }).click();
    await expect(page.getByRole("heading", { name: first })).toHaveCount(0);
    await page.waitForLoadState("networkidle");

    // Then: a brand-new companion can be adopted right away (no month-long wait)
    const second = unique("Fern ");
    await adoptPet(page, "Gentle", second);
    await expect(page.getByRole("heading", { name: second })).toBeVisible();
  });

  test("a second adoption in the same month is refused with a clear reason", async ({ page }) => {
    // Given: a living companion already adopted this month
    const keeper = unique("Tako ");
    await adoptPet(page, "Calm", keeper);

    // When: the user tries to adopt a second companion without releasing the first
    const blocked = unique("Nimbus ");
    await page.getByRole("button", { name: "Fiery" }).click();
    await page.getByLabel("Name").fill(blocked);
    await page.getByRole("button", { name: new RegExp(`Adopt ${blocked}`, "i") }).click();

    // Then: the real monthly-limit reason is surfaced (not a blank production error)
    await expect(page.getByText("Couldn't adopt pet")).toBeVisible();
    await expect(page.getByText(/one pet per month/i)).toBeVisible();

    // And: no second pet was created; the first remains
    await expect(page.getByRole("heading", { name: blocked })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: keeper })).toBeVisible();
  });

  test("completing a habit lets you feed a companion and the feed persists", async ({ page }) => {
    // Given: a habit completed today (earns pet food) and one adopted companion
    const habitId = await seedHabit(page, unique("Drink Water "), "a hydrated person");
    await checkInOn(page, habitId, todayKey());

    await page.goto("/pet");
    const petName = unique("Sprout ");
    await adoptPet(page, "Calm", petName);

    const card = page.locator("article", { has: page.getByRole("heading", { name: petName }) });
    // A freshly adopted pet starts with no lifetime feeds.
    await expect(card.getByText(/0 feeds fed/i)).toBeVisible();

    // When: the user feeds the companion using today's earned food. We wait for
    // the feed server action's POST to resolve so the write is committed before
    // we reload — networkidle alone can race ahead of the server action.
    const feed = card.getByRole("button", { name: "Feed", exact: true });
    await expect(feed).toBeEnabled();
    const feedCommitted = page.waitForResponse(
      (res) => res.request().method() === "POST" && res.ok(),
    );
    await feed.click();

    // Then: a lifetime feed is recorded for that pet (optimistic update)
    await expect(card.getByText(/1 feed fed/i)).toBeVisible();
    await feedCommitted;

    // And: the feed survives a reload (it was persisted, not optimistically reverted)
    await page.reload();
    const reloaded = page.locator("article", { has: page.getByRole("heading", { name: petName }) });
    await expect(reloaded.getByText(/1 feed fed/i)).toBeVisible();
  });
});
