import { expect, test } from "@playwright/test";

import { getPreferences, onboardingDialog, registerUser } from "./helpers";

/**
 * Settings journeys (AGENTS.md § App Context: Settings — theme, accent,
 * reminder preferences, welcome tour). Preferences are saved to the account,
 * so each test registers a fresh user and never touches the shared dev user's
 * appearance (which other specs, e.g. the a11y audit, depend on).
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("appearance settings", () => {
  test("switching to the dark theme applies immediately and persists across reloads", async ({ page }) => {
    // Given: a new user on Settings with the light theme
    await registerUser(page, { prefix: "theme" });
    await page.goto("/settings");
    const theme = page.getByRole("group", { name: "Theme" });
    await expect(theme.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");

    // When: they choose Dark
    await theme.getByRole("button", { name: "Dark" }).click();

    // Then: the page turns dark and confirms the change
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByText("Dark theme on")).toBeVisible();
    await expect.poll(async () => (await getPreferences(page)).theme).toBe("dark");

    // And: it stays dark after a reload, even with this browser's local cache cleared
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("group", { name: "Theme" }).getByRole("button", { name: "Dark" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // And: other pages use the dark theme too
    await page.goto("/habits");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("choosing an accent colour is remembered after a reload", async ({ page }) => {
    // Given: a new user on Settings
    await registerUser(page, { prefix: "accent" });
    await page.goto("/settings");
    const accents = page.getByRole("group", { name: "Accent colour" });
    const before = (await getPreferences(page)).accentHue;

    // When: they pick the Plum accent
    await accents.getByRole("button", { name: "Plum" }).click();

    // Then: Plum is selected and the choice is saved to their account
    await expect(accents.getByRole("button", { name: "Plum" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Accent saved")).toBeVisible();
    await expect.poll(async () => (await getPreferences(page)).accentHue).not.toBe(before);

    // And: it is still selected after a reload
    await page.reload();
    await expect(
      page.getByRole("group", { name: "Accent colour" }).getByRole("button", { name: "Plum" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("preference switches", () => {
  for (const [label, key] of [
    ["Daily reminders", "remindersEnabled"],
    ["Weekly review nudge", "weeklyReviewNudge"],
    ["Accountability nudges", "accountabilityNudge"],
  ] as const) {
    test(`toggling "${label}" is saved to the account and survives a reload`, async ({ page }) => {
      // Given: a new user on Settings
      await registerUser(page, { prefix: `pref-${key}` });
      await page.goto("/settings");
      const toggle = page.getByRole("switch", { name: label });
      const initial = (await toggle.getAttribute("aria-checked")) === "true";

      // When: they flip the switch
      await toggle.click();

      // Then: it shows the new state and the account remembers it
      await expect(toggle).toHaveAttribute("aria-checked", String(!initial));
      await expect.poll(async () => (await getPreferences(page))[key]).toBe(!initial);

      // And: the new state is shown after a reload
      await page.reload();
      await expect(page.getByRole("switch", { name: label })).toHaveAttribute("aria-checked", String(!initial));
    });
  }
});

test.describe("welcome tour", () => {
  test("Replay tour shows the welcome tour again and it can be dismissed", async ({ page }) => {
    // Given: a user who already skipped the tour
    await registerUser(page, { prefix: "replay" });
    await page.goto("/settings");
    await expect(onboardingDialog(page)).toHaveCount(0);

    // When: they choose Replay tour
    await page.getByRole("button", { name: "Replay tour" }).click();

    // Then: the welcome tour opens
    const tour = onboardingDialog(page);
    await expect(tour).toBeVisible();

    // When: they skip it again
    await tour.getByRole("button", { name: "Skip" }).click();

    // Then: it closes and stays closed after a reload
    await expect(tour).toBeHidden();
    await expect.poll(async () => (await getPreferences(page)).onboardingSeen).toBe(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await expect(onboardingDialog(page)).toHaveCount(0);
  });
});
