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
 * pet.spec — end-to-end coverage of the Pet Ecosystem tab. It walks the real
 * user journey that makes the feature meaningful: complete a habit to earn food
 * (each completion grants 3 feeds), adopt a procedurally-generated companion,
 * spend that food to feed it, and release it to free its slot.
 *
 * Like the other E2E specs this drives a real browser against the running app +
 * database, so it guards the user-visible loop, not just the internals. Pets are
 * persisted in Postgres (no localStorage) and the dev user/database are shared,
 * so every test first releases all pets and clears all habits to start from a
 * known-clean slate (a free monthly slot and zero earned food). Shared helpers
 * live in ./pet-helpers.
 */

test.describe("Pet ecosystem", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupHabits(page);
    await releaseAllPets(page);
  });

  test("complete a habit, adopt a companion, and feed it", async ({ page }) => {
    // Given: a habit completed today, which earns three pieces of pet food
    const id = await seedHabit(page, unique("Drink Water "), "a hydrated person");
    await checkInOn(page, id, todayKey());

    // When: the user opens the Pet tab and adopts a companion
    await page.goto("/pet");
    const petName = unique("Sprout ");
    await adoptPet(page, "Calm", petName);

    // Then: today's completed habit shows as available food
    await expect(page.getByText(/food available today/i)).toBeVisible();

    // When: the user feeds that companion (scoped to its card; the "Feed" button
    // is matched exactly so it never collides with "Feed fewer" / "Feed more")
    const card = page.locator("article", { has: page.getByRole("heading", { name: petName }) });
    const feed = card.getByRole("button", { name: "Feed", exact: true });
    await expect(feed).toBeEnabled();
    await feed.click();

    // Then: a lifetime feed is recorded for that pet, and it survives the write
    await expect(card.getByText(/1 feed fed/i)).toBeVisible();
  });

  test("a companion cannot be fed before any habit is completed today", async ({ page }) => {
    // Given: a habit exists but has not been completed today (no food earned)
    await seedHabit(page, unique("Stretch "), "a supple person");

    // When: the user opens the Pet tab and adopts a companion
    await page.goto("/pet");
    const petName = unique("Ember ");
    await adoptPet(page, "Fiery", petName);

    // Then: with no food earned, that companion's Feed button is disabled
    const card = page.locator("article", { has: page.getByRole("heading", { name: petName }) });
    await expect(card.getByRole("button", { name: "Feed", exact: true })).toBeDisabled();
  });

  test("release a companion removes it from the ecosystem", async ({ page }) => {
    // Given: a freshly-adopted companion (the slate is clean, so adoption succeeds)
    await page.goto("/pet");
    const petName = unique("Willow ");
    await adoptPet(page, "Gentle", petName);

    const card = page.locator("article", { has: page.getByRole("heading", { name: petName }) });

    // When: the user confirms releasing that specific companion. The confirm
    // dialog is already auto-accepted by the handler releaseAllPets registered in
    // beforeEach, so we must NOT register a second handler (that would double-
    // accept the same dialog and throw).
    await card.getByRole("button", { name: /^release$/i }).click();

    // Then: the companion's card is gone
    await expect(page.getByRole("heading", { name: petName })).toHaveCount(0);
  });
});
