import { expect, test } from "@playwright/test";

import { registerUser, seedHabit, unique } from "./helpers";
import { adoptPet } from "./pet-helpers";

/**
 * Pet Ecosystem gaps not covered by pet-adoption.spec.ts: the food economy
 * from a user's very first visit. A brand-new user has no food until they
 * show up for a habit, so feeding must be blocked with a clear reason and
 * unlocked by a real check-in on Today.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("pet food economy", () => {
  test("a companion cannot be fed until a habit is completed, then feeding unlocks", async ({ page }) => {
    // Given: a new user with one habit and a freshly adopted companion
    await registerUser(page, { prefix: "pet-food" });
    const habit = unique("Walk outside");
    await seedHabit(page, habit, "an outdoors person");
    await page.goto("/pet");
    const petName = unique("Pebble");
    await adoptPet(page, "Calm", petName);
    const card = page.locator("article", { has: page.getByRole("heading", { name: petName }) });

    // Then: there is no food today, so Feed is disabled with the reason
    const food = page.getByRole("region", { name: "Food available today" });
    await expect(food).toContainText(/^\s*0\s*Food available today/);
    await expect(card.getByRole("button", { name: "Feed", exact: true })).toBeDisabled();
    await expect(card.getByText("Complete a habit to earn food.")).toBeVisible();

    // When: they complete the habit on Today
    await page.goto("/");
    await page.getByRole("button", { name: `Mark ${habit} done` }).click();
    const sheet = page.getByRole("dialog").filter({ hasText: "feel?" });
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("heading", { name: "All done for today" })).toBeVisible();

    // Then: back on the pet page there is food and the companion can be fed
    await expect
      .poll(async () => {
        const res = await page.request.get("/api/v1/habits");
        const habits: Array<{ name: string; history: Record<string, unknown> }> = (await res.json()).data.habits;
        return Object.keys(habits.find((item) => item.name === habit)?.history ?? {}).length;
      })
      .toBe(1);
    await page.goto("/pet");
    const reloadedCard = page.locator("article", { has: page.getByRole("heading", { name: petName }) });
    await expect(page.getByRole("region", { name: "Food available today" })).toContainText(/^\s*[1-9]\d*\s*Food available today/);
    await expect(reloadedCard.getByRole("button", { name: "Feed", exact: true })).toBeEnabled();
    await expect(reloadedCard.getByText("Complete a habit to earn food.")).toHaveCount(0);
  });
});
