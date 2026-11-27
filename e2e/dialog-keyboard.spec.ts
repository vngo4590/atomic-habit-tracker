import { expect, test, type Locator, type Page } from "@playwright/test";

import { getPreferences, onboardingDialog, registerUser, seedHabit, unique } from "./helpers";

/**
 * Keyboard behaviour of the app's modal dialogs (MASTER.md: focus trap, Esc,
 * return focus): focus moves into the dialog, Tab cannot reach the page behind
 * it, Escape closes it, and focus is restored when it closes.
 *
 * Every test registers its own throwaway user, so it starts signed out.
 */
test.use({ storageState: { cookies: [], origins: [] } });

/** True when the currently focused element sits inside `dialog`. */
async function focusIsInside(dialog: Locator): Promise<boolean> {
  return dialog.evaluate((node) => node.contains(document.activeElement));
}

/** Press Tab `count` times and check focus never escapes `dialog`. */
async function expectTabStaysInside(page: Page, dialog: Locator, count = 6, shift = false): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await page.keyboard.press(shift ? "Shift+Tab" : "Tab");
    expect(await focusIsInside(dialog)).toBe(true);
  }
}

test.describe("onboarding tour keyboard", () => {
  test("focuses the tour, keeps Tab inside, follows each step, and Escape skips it", async ({ page }) => {
    // Given: a freshly registered user is greeted by the tour
    await registerUser(page, { prefix: "kbd_onboarding", dismiss: false });
    const tour = onboardingDialog(page);
    await expect(tour).toBeVisible();

    // Then: focus starts on the primary action, not the page behind
    await expect(tour.getByRole("button", { name: "Begin" })).toBeFocused();

    // And: Tab / Shift+Tab cycle inside the tour only
    await expectTabStaysInside(page, tour);
    await expectTabStaysInside(page, tour, 6, true);

    // When: they advance with the keyboard
    await tour.getByRole("button", { name: "Begin" }).focus();
    await page.keyboard.press("Enter");

    // Then: focus follows to the next step's primary action
    await expect(tour.getByRole("heading", { name: "Habits are identity votes." })).toBeVisible();
    await expect(tour.getByRole("button", { name: "Continue" })).toBeFocused();

    // When: they press Escape
    await page.keyboard.press("Escape");

    // Then: the tour closes like Skip, is remembered, and focus is back on the page
    await expect(tour).toBeHidden();
    await expect.poll(async () => (await getPreferences(page)).onboardingSeen).toBe(true);
    expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);
  });
});

test.describe("formation questionnaire keyboard", () => {
  test("opens with focus inside, traps Tab, closes on Escape and returns focus to Review", async ({ page }) => {
    // Given: a user with a habit that is 66+ days old (the browser clock is
    // moved forward so the habit is due for its formation review)
    await registerUser(page, { prefix: "kbd_formation" });
    const name = unique("Keyboard review");
    await seedHabit(page, name, "a calm reader");
    await page.clock.setFixedTime(new Date(Date.now() + 70 * 86_400_000));
    await page.goto("/hall-of-fame");
    const review = page.getByRole("button", { name: `Review ${name}` });
    await expect(review).toBeVisible();

    // When: they open the review from the keyboard
    await review.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name });
    await expect(dialog).toBeVisible();

    // Then: focus is inside the dialog, and Tab / Shift+Tab never leave it
    await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
    await expectTabStaysInside(page, dialog, 30);
    await expectTabStaysInside(page, dialog, 6, true);

    // When: they press Escape
    await page.keyboard.press("Escape");

    // Then: the dialog closes and focus returns to the Review button
    await expect(dialog).toBeHidden();
    await expect(review).toBeFocused();
  });
});
