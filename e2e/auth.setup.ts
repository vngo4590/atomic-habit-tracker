import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "dev@atomicly.local");
  await page.fill('input[name="password"]', "Atomicly1!");
  await page.click('button[type="submit"]');

  // Wait for redirect to the app after successful login
  await page.waitForURL("/", { timeout: 10000 });
  await expect(page.locator('button:has-text("New habit")').first()).toBeVisible();

  // Dismiss onboarding overlay if it appears
  const skipOnboarding = page.locator('.overlay button:has-text("Skip")');
  if (await skipOnboarding.isVisible().catch(() => false)) {
    await skipOnboarding.click();
    await expect(skipOnboarding).not.toBeVisible();
  }

  await page.context().storageState({ path: authFile });
});
