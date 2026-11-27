import { expect, type Page } from "@playwright/test";

/**
 * Shared end-to-end helpers for the journey specs added alongside the UI
 * revamp (auth-onboarding, habit-lifecycle, reflection, settings, pet-ecosystem,
 * a11y). Older specs keep their own local copies on purpose — this file is only
 * consumed by the newer specs so nothing existing has to change.
 *
 * Every helper drives the real app: state is seeded through the public
 * `/api/v1` routes (sharing the browser context's auth cookie via
 * `page.request`) or the real registration form, never by touching the DB.
 */

let counter = 0;

/** Build a collision-free name so parallel projects / re-runs never clash. */
export function unique(name: string): string {
  return `${name} ${Date.now()}_${++counter}`;
}

/** Build a collision-free e-mail for a throwaway account. */
export function uniqueEmail(prefix: string): string {
  return `e2e_${prefix}_${Date.now()}_${++counter}@atomicly.test`;
}

/** YYYY-MM-DD date key `offset` days from today in the local zone. */
export function dayKey(offset = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Remove (archive) every active habit owned by the signed-in user. */
export async function cleanupHabits(page: Page): Promise<void> {
  const listRes = await page.request.get("/api/v1/habits");
  if (!listRes.ok()) return;
  const body = await listRes.json();
  const habits: Array<{ id: string }> = body.data?.habits ?? [];
  for (const habit of habits) {
    await page.request.delete(`/api/v1/habits/${habit.id}`);
  }
}

/** Create a habit straight through the API (used to set up state for a test). */
export async function seedHabit(
  page: Page,
  name: string,
  identity: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const response = await page.request.post("/api/v1/habits", {
    data: {
      name,
      identity,
      emoji: "•",
      response: name,
      loopResponse: name,
      schedule: "Daily",
      time: "Morning",
      contractPartners: [],
      ...overrides,
    },
  });
  expect(response.status(), `seeding habit "${name}"`).toBe(201);
  const body = await response.json();
  return body.data.habit.id as string;
}

/** Record (or clear) a check-in for a habit on a specific day. */
export async function checkInOn(page: Page, habitId: string, dateKey: string, done = true): Promise<void> {
  const response = await page.request.post(`/api/v1/habits/${habitId}/check-ins`, {
    data: { dateKey, done },
  });
  expect(response.ok()).toBe(true);
}

/** Read the signed-in user's active habits from the API (server truth). */
export async function listHabits(
  page: Page,
): Promise<Array<{ id: string; name: string; identity: string; schedule: string; history: Record<string, unknown> }>> {
  const response = await page.request.get("/api/v1/habits");
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return body.data?.habits ?? [];
}

/** Patch the signed-in user's saved preferences (theme, nudges, onboarding…). */
export async function setPreferences(page: Page, patch: Record<string, unknown>): Promise<void> {
  const response = await page.request.patch("/api/v1/reflection/preferences", { data: patch });
  expect(response.ok(), `saving preferences ${JSON.stringify(patch)}`).toBe(true);
}

/** Read the signed-in user's saved preferences. */
export async function getPreferences(page: Page): Promise<Record<string, unknown>> {
  const response = await page.request.get("/api/v1/reflection/preferences");
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return body.data.preferences;
}

/** The first-run onboarding dialog. */
export function onboardingDialog(page: Page) {
  return page.getByRole("dialog").filter({ has: page.getByRole("button", { name: "Skip" }) });
}

/** The first-run onboarding overlay's Skip button. */
export function onboardingSkip(page: Page) {
  return onboardingDialog(page).getByRole("button", { name: "Skip" });
}

/** Dismiss the first-run onboarding overlay if it is showing. */
export async function dismissOnboarding(page: Page): Promise<void> {
  // A brand-new account always gets the tour, but it mounts after hydration —
  // wait for it rather than racing it, then wait for the server to remember
  // the choice so a later full navigation does not show it again.
  await expect(onboardingDialog(page)).toBeVisible();
  await onboardingSkip(page).click();
  await expect(onboardingDialog(page)).toBeHidden();
  await expect.poll(async () => (await getPreferences(page)).onboardingSeen).toBe(true);
}

/** A password that satisfies the registration policy (letter, number, symbol). */
export const STRONG_PASSWORD = "E2e-Journey-Pw1!";

/**
 * Register a brand-new account through the real /register form. On success the
 * user is signed in and lands on Today. The onboarding overlay is left as-is
 * unless `dismiss` is true. Requires a signed-out browser context.
 */
export async function registerUser(
  page: Page,
  { prefix = "journey", name = "E2E Journey Tester", dismiss = true } = {},
): Promise<string> {
  const email = uniqueEmail(prefix);
  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(STRONG_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });
  await expect(page.getByTestId("today-view")).toBeVisible();
  if (dismiss) await dismissOnboarding(page);
  return email;
}

/** True when the current viewport uses the mobile shell (bottom tab bar). */
export function isMobileShell(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1280) < 1024;
}

/** Navigate to a primary destination through the visible navigation. */
export async function navigateTo(page: Page, label: string): Promise<void> {
  const nav = isMobileShell(page)
    ? page.getByRole("navigation", { name: "Primary" })
    : page.getByRole("navigation", { name: "Main navigation" });
  await nav.getByRole("link", { name: label }).click();
}
