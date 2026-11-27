import { test as setup, expect } from "@playwright/test";

import { dismissOnboardingIfPending } from "./helpers";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "dev@atomicly.local");
  await page.fill('input[name="password"]', "Atomicly1!");
  await page.click('button[type="submit"]');

  // Wait for redirect to the app after successful login
  await page.waitForURL("/", { timeout: 10000 });
  await expect(page.getByTestId("today-view")).toBeVisible();

  // Dismiss the onboarding overlay if this user has not seen it yet
  await dismissOnboardingIfPending(page);

  await page.context().storageState({ path: authFile });
});
