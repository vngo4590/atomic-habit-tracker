import { expect, test } from "@playwright/test";

import { STRONG_PASSWORD, uniqueEmail } from "./helpers";

/**
 * Progressive-enhancement regression: /login and /register must still work as
 * plain HTML forms when JavaScript is off (the server action is submitted
 * natively). Guards against wrapping the action in a client function, which
 * silently drops the metadata React needs for native submission.
 */
test.use({ javaScriptEnabled: false, storageState: { cookies: [], origins: [] } });

test.describe("auth without JavaScript", () => {
  test("the dev user signs in through the native form and lands on Today", async ({ page }) => {
    // Given: the login page rendered without any client JavaScript
    await page.goto("/login");

    // When: they submit valid credentials
    await page.getByLabel("Email").fill("dev@atomicly.local");
    await page.getByLabel("Password", { exact: true }).fill("Atomicly1!");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Then: the server signs them in and redirects to Today
    await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });
    // (attached, not visible: entrance animations stay at opacity 0 without JS)
    await expect(page.getByTestId("today-view")).toBeAttached();
  });

  test("a visitor registers through the native form and lands on Today", async ({ page }) => {
    // Given: the register page rendered without any client JavaScript
    await page.goto("/register");

    // When: they submit a valid new account
    await page.getByLabel("Name").fill("No Script Tester");
    await page.getByLabel("Email").fill(uniqueEmail("nojs_register"));
    await page.getByLabel("Password", { exact: true }).fill(STRONG_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    // Then: the account is created, signed in, and shown Today
    await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });
    // (attached, not visible: entrance animations stay at opacity 0 without JS)
    await expect(page.getByTestId("today-view")).toBeAttached();
  });
});
