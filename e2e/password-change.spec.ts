import { test, expect, type Page } from "@playwright/test";

/**
 * password-change.spec — end-to-end regression proof for the
 * `fix-password-change-session-survival` change.
 *
 * WHAT THIS PROVES (and why only an E2E test can):
 * A successful password change advances the user's server-side revocation cutoff
 * (`sessionsValidFrom`) via `revokeUserSessions`, which — before the fix — ALSO
 * logged out the current device. The fix re-issues the current session cookie
 * with a fresh `authTime` by calling next-auth `updateSession({})` inside the
 * server action. The unit/integration tests mock `updateSession`, so they can
 * only prove the action CALLS it — they cannot prove the real Set-Cookie round
 * trip actually keeps the browser signed in. This spec drives a real browser
 * against the real app + database, so the fact that `/api/v1/session` (which runs
 * `getCurrentUser` → `isSessionRevoked(authTime, sessionsValidFrom)`) STILL
 * resolves the user after a change — and that a SECOND, third, fourth and fifth
 * in-session change is ACCEPTED rather than rejected with "Not authenticated." —
 * is the load-bearing evidence that the cookie was genuinely re-issued and
 * survived the revocation gate.
 *
 * OBSERVED APP BEHAVIOUR (prod build): a SUCCESSFUL change (which sets a fresh
 * session cookie server-side) triggers a client refresh that lands the user back
 * on their authenticated home dashboard ("/"). A FAILED change (wrong current
 * password, or an invalid new password) sets no cookie, so the form simply stays
 * on /settings and renders the specific error message. The tests key off this
 * clean distinction rather than trying to catch the momentary in-place
 * "Password changed." confirmation, which the refresh navigates away from.
 *
 * ISOLATION: these tests REGISTER a fresh user each time (see `test.use` below)
 * rather than reusing the shared `dev@atomicly.local` account. Changing a shared
 * account's password 5x would corrupt `e2e/auth.setup.ts` (which logs in with the
 * fixed dev password) and every other spec. A throwaway user keeps this spec
 * hermetic.
 *
 * PREREQUISITES (see openspec/changes/fix-password-change-session-survival/tasks.md §5):
 *  - A running DB-backed app and Playwright browsers.
 *  - RATE_LIMIT_DISABLED=true — otherwise the 5x change loop trips the API rate
 *    limiter in `proxy.ts` (and the login throttle in `lib/security/login-throttle.ts`).
 *  - On Windows, run the prod server via `npx next start -p 3000` with BASE_URL set
 *    so `playwright.config.ts` skips its own webServer.
 */

// Start every test in this file SIGNED OUT. The chromium/Mobile Chrome projects
// default to the dev user's saved storageState; we override it with an empty
// state so `/register` does not immediately redirect an already-authenticated
// user away, and so we never touch the shared dev account.
test.use({ storageState: { cookies: [], origins: [] } });

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

let counter = 0;

/** Build a collision-free e-mail so parallel projects / re-runs never clash. */
function uniqueEmail(): string {
  return `e2e_pwchange_${Date.now()}_${++counter}@atomicly.test`;
}

/**
 * A ladder of valid passwords the tests chain through (old -> new each step).
 * Every entry satisfies `changePasswordAction`'s rules: >= 8 chars AND at least
 * one letter, one number, and one symbol. Index 0 doubles as the registration
 * password, so the first change is P0 -> P1.
 */
const PASSWORDS = [
  "E2ePwChange!0",
  "E2ePwChange!1",
  "E2ePwChange!2",
  "E2ePwChange!3",
  "E2ePwChange!4",
  "E2ePwChange!5",
] as const;

/**
 * Register a brand-new account through the real registration form. On success
 * `registerAction` signs the user in and redirects to the app, so the returned
 * page is authenticated. Returns the new user's e-mail so tests can assert it
 * stays resolvable (a proxy for "still authenticated").
 */
async function registerUser(page: Page): Promise<string> {
  const email = uniqueEmail();

  // Fill and submit the shared AuthForm (name + email + password fields).
  await page.goto("/register");
  await page.fill('input[name="name"]', "E2E Password Tester");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORDS[0]);
  await page.getByRole("button", { name: "Create account" }).click();

  // A successful registration redirects to the app root.
  await page.waitForURL("http://localhost:3000/", { timeout: 15_000 });

  // A first-run user may see the onboarding overlay; dismiss it so it can never
  // intercept a later click on the Settings controls.
  const skipOnboarding = page.locator('.overlay button:has-text("Skip")');
  if (await skipOnboarding.isVisible().catch(() => false)) {
    await skipOnboarding.click();
    await expect(skipOnboarding).not.toBeVisible();
  }

  return email;
}

/**
 * Navigate to Settings and open the (closed) change-password panel. Asserts the
 * page resolved the current user by e-mail first — the Settings page only renders
 * that row when `getCurrentUser` succeeds, so it doubles as a "still signed in"
 * check before we start.
 */
async function openChangePasswordPanel(page: Page, email: string): Promise<void> {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();

  // The Password row's toggle is the button whose accessible name is exactly
  // "Change" (the submit button is "Change password", so `exact` disambiguates).
  await page.getByRole("button", { name: "Change", exact: true }).click();
  await expect(page.locator('input[name="currentPassword"]')).toBeVisible();
}

/**
 * Fill and submit the change-password form. Targets the inputs by their `name`
 * (not the eye toggle) per the spec's locator convention. Re-filling both fields
 * is deliberate: React resets an uncontrolled form after a submit, so we never
 * rely on retained values across a retry.
 */
async function submitChange(page: Page, current: string, next: string): Promise<void> {
  await page.locator('input[name="currentPassword"]').fill(current);
  await page.locator('input[name="newPassword"]').fill(next);
  await page.getByRole("button", { name: "Change password" }).click();
}

/**
 * Assert — at the authoritative source of truth — that the current browser
 * cookie still resolves the signed-in user server-side. `/api/v1/session` runs
 * `getCurrentUser`, which applies the `isSessionRevoked(authTime, sessionsValidFrom)`
 * gate. If `updateSession({})` had NOT re-issued the cookie, this would report
 * `authenticated: false` after the first change. `page.request` shares the
 * browser context's cookies, so this exercises the real Set-Cookie round trip.
 */
async function expectStillAuthenticated(page: Page, email: string): Promise<void> {
  const response = await page.request.get("/api/v1/session");
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.data.authenticated, "current session must survive the password change").toBe(true);
  expect(body.data.user?.email).toBe(email);
}

/** Wait for the user-visible success signal of a valid change and confirm the
 *  session survived. A successful change sets a fresh session cookie server-side,
 *  which makes the app refresh onto the authenticated home dashboard ("/"); we
 *  accept either the momentary in-place "Password changed." confirmation OR that
 *  landing as success, then confirm the session is still valid and the user was
 *  not stranded on /login. */
async function expectChangeSucceeded(page: Page, email: string): Promise<void> {
  await expect(async () => {
    const onHome = new URL(page.url()).pathname === "/";
    const confirmed = await page
      .getByText("Password changed.", { exact: true })
      .isVisible()
      .catch(() => false);
    expect(onHome || confirmed, "a valid change must confirm success or land on the home dashboard").toBe(true);
  }).toPass({ timeout: 15_000 });

  await page.waitForLoadState("networkidle").catch(() => {});
  // The user is NOT stranded on the login page, and the current cookie still
  // resolves the user server-side — the load-bearing proof of the fix.
  await expect(page).not.toHaveURL(/\/login(\?|$)/);
  await expectStillAuthenticated(page, email);
}

/** Open the panel, submit one valid change, and assert it succeeded without
 *  signing the current device out. */
async function changePasswordSucceeds(page: Page, current: string, next: string, email: string): Promise<void> {
  await openChangePasswordPanel(page, email);
  await submitChange(page, current, next);
  await expectChangeSucceeded(page, email);
}

/* -------------------------------------------------------------------------- */
/* Tests                                                                       */
/* -------------------------------------------------------------------------- */

test.describe("password change keeps the current device signed in", () => {
  // 5.1 — The direct regression proof for the reported bug.
  test("a user can change their password 5 times in a row without being signed out", async ({ page }) => {
    // Given: a freshly registered, signed-in user.
    const email = await registerUser(page);

    // When: they chain five valid password changes (P0->P1->...->P5) in one
    // session. Each step uses the PREVIOUS new password as its current password,
    // so a step can only succeed if the prior change actually took effect AND the
    // session survived — exactly the behaviour that used to break after change #1.
    for (let step = 1; step < PASSWORDS.length; step += 1) {
      await changePasswordSucceeds(page, PASSWORDS[step - 1], PASSWORDS[step], email);
    }

    // Then: the password genuinely moved away from the original — re-submitting
    // the ORIGINAL password as "current" is now rejected as incorrect (and, once
    // more, NOT as "Not authenticated."). This stays on /settings because a
    // rejected change sets no cookie and triggers no refresh.
    await openChangePasswordPanel(page, email);
    await submitChange(page, PASSWORDS[0], "SomethingElse!9");
    await expect(page.getByText("Current password is incorrect.")).toBeVisible();
    await expect(page.getByText("Not authenticated.")).toHaveCount(0);
    await expectStillAuthenticated(page, email);
  });

  // 5.2 — Wrong current password reports the accurate message, and the session
  // survives (proving the misleading "Not authenticated." is gone).
  test("a wrong current password shows 'incorrect', not 'not authenticated', and the form stays usable", async ({ page }) => {
    // Given: a signed-in user with the change-password panel open.
    const email = await registerUser(page);
    await openChangePasswordPanel(page, email);

    // When: they submit an incorrect current password (with a valid new one).
    await submitChange(page, "WrongCurrent!9", PASSWORDS[1]);

    // Then: the specific "incorrect" message appears — NOT "Not authenticated." —
    // because the still-valid session lets the action reach the password check.
    // The form stays put on /settings (a rejected change sets no cookie).
    await expect(page.getByText("Current password is incorrect.")).toBeVisible();
    await expect(page.getByText("Not authenticated.")).toHaveCount(0);

    // And: the form is still usable (inputs present) and the session is intact.
    await expect(page.locator('input[name="currentPassword"]')).toBeVisible();
    await expectStillAuthenticated(page, email);
  });

  // 5.3 — The EXACT user-reported scenario: a wrong attempt, then an immediate
  // correct change in the same session, must succeed.
  test("after a wrong attempt, a correct change in the same session still succeeds", async ({ page }) => {
    // Given: a signed-in user who has just fumbled their current password.
    const email = await registerUser(page);
    await openChangePasswordPanel(page, email);
    await submitChange(page, "WrongCurrent!9", PASSWORDS[1]);
    await expect(page.getByText("Current password is incorrect.")).toBeVisible();

    // When: they immediately retry with the CORRECT current password.
    await submitChange(page, PASSWORDS[0], PASSWORDS[1]);

    // Then: the change succeeds and the user remains authenticated — this is the
    // precise flow the user hit ("keeps saying not authenticated").
    await expectChangeSucceeded(page, email);
  });

  // 5.4 — A new password that violates a rule shows the specific validation
  // message and does not change the password.
  test("a new password missing a symbol shows the specific validation message", async ({ page }) => {
    // Given: a signed-in user with the panel open.
    const email = await registerUser(page);
    await openChangePasswordPanel(page, email);

    // When: they submit a new password with a letter and number but no symbol.
    await submitChange(page, PASSWORDS[0], "NoSymbol123");

    // Then: the exact rule message is shown, the form stays on /settings, and the
    // session is untouched (no cookie was re-issued).
    await expect(page.getByText("New password must include a symbol.")).toBeVisible();
    await expectStillAuthenticated(page, email);

    // And: the original password still works — proving nothing changed. Changing
    // with the ORIGINAL current password now succeeds.
    await changePasswordSucceeds(page, PASSWORDS[0], PASSWORDS[1], email);
  });

  // 5.5 — Reopening the panel after a success shows a fresh, empty form (guards
  // the ChangePasswordForm unmount-on-close reset fix).
  test("reopening the panel after a successful change shows a fresh empty form", async ({ page }) => {
    // Given: a signed-in user who has completed one successful change.
    const email = await registerUser(page);
    await changePasswordSucceeds(page, PASSWORDS[0], PASSWORDS[1], email);

    // When: they return to Settings and reopen the change-password panel.
    await openChangePasswordPanel(page, email);

    // Then: the reopened form is a clean slate — empty inputs and NO stale
    // "Password changed." success row left over from the previous change.
    await expect(page.locator('input[name="currentPassword"]')).toHaveValue("");
    await expect(page.locator('input[name="newPassword"]')).toHaveValue("");
    await expect(page.getByText("Password changed.", { exact: true })).toHaveCount(0);
  });
});
