import { expect, test } from "@playwright/test";

import {
  STRONG_PASSWORD,
  getPreferences,
  onboardingDialog,
  registerUser,
  uniqueEmail,
} from "./helpers";

/**
 * Auth + onboarding journeys (AGENTS.md § App Context: register, sign in,
 * protected routes, first-run tour, sign out).
 *
 * Every test here starts signed out — the shared dev-user cookie is dropped —
 * and anything that needs an account registers its own throwaway user so the
 * shared dev session can never be signed out or polluted by these specs.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("registration and first-run onboarding", () => {
  test("a new user registers, steps through the welcome tour, and never sees it again", async ({ page }) => {
    // Given: a brand-new visitor registers through the real form
    await registerUser(page, { prefix: "onboard_steps", dismiss: false });

    // Then: the first-run tour greets them on Today
    const tour = onboardingDialog(page);
    await expect(tour).toBeVisible();
    await expect(tour.getByRole("heading", { name: "Build evidence, one vote at a time." })).toBeVisible();

    // When: they step through every card
    await tour.getByRole("button", { name: "Begin" }).click();
    await expect(tour.getByRole("heading", { name: "Habits are identity votes." })).toBeVisible();
    await tour.getByRole("button", { name: "Continue" }).click();
    await expect(tour.getByRole("heading", { name: "Start with the smallest useful action." })).toBeVisible();
    await tour.getByRole("button", { name: "Start" }).click();

    // Then: the tour closes and the empty Today invites the first habit
    await expect(tour).toBeHidden();
    await expect.poll(async () => (await getPreferences(page)).onboardingSeen).toBe(true);
    await expect(page.getByRole("heading", { name: "Build your first habit in three small steps" })).toBeVisible();

    // When: they reload the page
    await page.reload();

    // Then: the tour stays dismissed because completion was saved server-side
    await expect(page.getByTestId("today-view")).toBeVisible();
    await expect(page.getByRole("link", { name: "Create your first habit" })).toBeVisible();
    await expect(onboardingDialog(page)).toHaveCount(0);
  });

  test("skipping the welcome tour also keeps it dismissed after a reload", async ({ page }) => {
    // Given: a freshly registered user is looking at the tour
    await registerUser(page, { prefix: "onboard_skip", dismiss: false });
    const tour = onboardingDialog(page);
    await expect(tour).toBeVisible();

    // When: they skip it on the first card
    await tour.getByRole("button", { name: "Skip" }).click();

    // Then: it closes, and it does not come back on reload
    await expect(tour).toBeHidden();
    await expect.poll(async () => (await getPreferences(page)).onboardingSeen).toBe(true);
    await page.reload();
    await expect(page.getByTestId("today-view")).toBeVisible();
    await expect(onboardingDialog(page)).toHaveCount(0);
  });

  test("registration rejects a password without a symbol and keeps the user on the form", async ({ page }) => {
    // Given: a visitor on the register page
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

    // When: they submit a long-enough password that lacks a symbol
    await page.getByLabel("Name").fill("Weak Password");
    await page.getByLabel("Email").fill(uniqueEmail("weak_pw"));
    await page.getByLabel("Password", { exact: true }).fill("password1");
    await page.getByRole("button", { name: "Create account" }).click();

    // Then: the password rule is explained inline and no account is created
    await expect(page.getByText("Password must include a symbol.")).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("registration refuses an e-mail that already has an account", async ({ page, browser }) => {
    // Given: an account already exists for an e-mail address
    const existing = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const existingPage = await existing.newPage();
    const email = await registerUser(existingPage, { prefix: "dup_email" });
    await existing.close();

    // When: someone tries to register again with that same address
    await page.goto("/register");
    await page.getByLabel("Name").fill("Second Person");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(STRONG_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    // Then: the duplicate is reported and they stay signed out on the form
    await expect(page.getByText("An account already exists for that email.")).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });
});

test.describe("sign in", () => {
  test("a wrong password shows an inline error and does not sign the user in", async ({ page }) => {
    // Given: the login page
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in to Atomicly" })).toBeVisible();

    // When: the dev user signs in with the wrong password
    await page.getByLabel("Email").fill("dev@atomicly.local");
    await page.getByLabel("Password", { exact: true }).fill("Not-The-Password1!");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Then: a generic credentials error is shown and the user stays on /login
    await expect(page.getByRole("alert").filter({ hasText: "Invalid email or password." })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    // And: protected pages are still off-limits
    await page.goto("/habits");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fhabits$/);
  });

  test("signing in from a protected-route redirect returns the user to that route", async ({ page }) => {
    // Given: a registered user who has signed out
    const context = page.context();
    const email = await registerUser(page, { prefix: "callback" });
    await context.clearCookies();

    // When: they open a protected page and are bounced to /login
    await page.goto("/journal");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fjournal$/);

    // And: they sign in with the right credentials
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(STRONG_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Then: they land on the page they originally asked for
    await expect(page).toHaveURL(/\/journal$/);
    await expect(page.getByRole("heading", { level: 1, name: "Journal" })).toBeVisible();
  });
});

test.describe("route guards", () => {
  for (const path of ["/", "/habits", "/analytics", "/settings", "/pet"]) {
    test(`a signed-out visit to ${path} is redirected to the login page`, async ({ page }) => {
      // Given: a visitor with no session
      // When: they open a protected route directly
      await page.goto(path);

      // Then: they see the sign-in form instead of the app
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole("heading", { name: "Sign in to Atomicly" })).toBeVisible();
      await expect(page.getByTestId("today-view")).toHaveCount(0);
    });
  }

  test("a signed-in user visiting /login or /register is sent back to Today", async ({ page }) => {
    // Given: a signed-in user
    await registerUser(page, { prefix: "guard_authed" });

    // When: they navigate to the login page
    await page.goto("/login");

    // Then: they are redirected to Today
    await expect(page).toHaveURL((url) => url.pathname === "/");
    await expect(page.getByTestId("today-view")).toBeVisible();

    // When: they navigate to the register page
    await page.goto("/register");

    // Then: they are redirected to Today as well
    await expect(page).toHaveURL((url) => url.pathname === "/");
    await expect(page.getByTestId("today-view")).toBeVisible();
  });
});

test.describe("sign out", () => {
  test("signing out from Settings ends the session and locks protected pages", async ({ page }) => {
    // Given: a signed-in user on Settings
    await registerUser(page, { prefix: "signout" });
    await page.goto("/settings");

    // When: they press Sign out in the account section
    await page.getByRole("main").getByRole("button", { name: "Sign out", exact: true }).click();

    // Then: they land on the login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign in to Atomicly" })).toBeVisible();

    // And: going back to Today requires signing in again
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("signing out from the desktop sidebar returns to the login page", async ({ page, isMobile }) => {
    test.skip(isMobile, "The sidebar sign-out button only exists in the desktop shell.");

    // Given: a signed-in user on Today
    await registerUser(page, { prefix: "signout_sidebar" });

    // When: they press the sidebar's Sign out button
    await page.getByRole("complementary", { name: "Sidebar" }).getByRole("button", { name: "Sign out" }).click();

    // Then: the session ends and protected pages redirect to /login
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/habits");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fhabits$/);
  });
});
