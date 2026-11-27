import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";

import { cleanupHabits, seedHabit, setPreferences, unique } from "./helpers";

/**
 * a11y.spec — automated WCAG 2 A/AA audit of every main Atomicly screen, in
 * both the Light and Dark theme (ADR-0003: exactly two themes).
 *
 * Journey: a user — including one relying on a screen reader, keyboard or a
 * high-contrast need — can use sign-in, registration, Today, the habit library,
 * the create wizard, a habit's page, Insights, Reflect (journal, review,
 * identity), Hall of Fame, Pet and Settings without hitting a serious or
 * critical accessibility barrier.
 *
 * axe-core runs against the real rendered page (real CSS tokens, real theme),
 * which is something jsdom-based unit tests cannot do — colour contrast in
 * particular depends on the computed theme tokens.
 *
 * The audit only fails on `serious` / `critical` impact so the gate tracks
 * genuine barriers; lower-impact findings are attached to the report.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa"];
const BLOCKING = new Set(["serious", "critical"]);
const THEMES = ["light", "dark"] as const;

type Theme = (typeof THEMES)[number];

/** Run axe on the current page and fail with a readable list of blocking issues. */
async function expectNoBlockingViolations(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const blocking = results.violations.filter((violation) => BLOCKING.has(violation.impact ?? ""));
  const summary = blocking.map(
    (violation) =>
      `[${violation.impact}] ${violation.id}: ${violation.help}\n` +
      violation.nodes
        .slice(0, 5)
        .map((node) => `    ${node.target.join(" ")} — ${node.failureSummary?.split("\n").slice(1).join(" ").trim()}`)
        .join("\n"),
  );
  expect(blocking, `${label} has serious/critical a11y violations:\n${summary.join("\n")}`).toEqual([]);
}

/** Wait until the page has settled: a main heading is shown and animations are done. */
async function settle(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  // Entrance animations fade content in; wait until nothing is mid-transition so
  // contrast is measured on the final colours, not a half-faded frame.
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running"));
}

/** Pin the theme before first paint (no-flash script reads localStorage). */
async function pinTheme(page: Page, theme: Theme): Promise<void> {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
  await page.addInitScript((value) => window.localStorage.setItem("atomicly:theme", value), theme);
}

for (const theme of THEMES) {
  test.describe(`accessibility audit (${theme} theme)`, () => {
    test.describe("signed-out screens", () => {
      test.use({ storageState: { cookies: [], origins: [] } });

      for (const route of ["/login", "/register"]) {
        test(`${route} has no serious or critical WCAG violations`, async ({ page }) => {
          // Given: a signed-out visitor using the ${theme} theme
          await pinTheme(page, theme);

          // When: they open the auth screen
          await page.goto(route);
          await settle(page);

          // Then: the theme is applied and axe finds no blocking barrier
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await expectNoBlockingViolations(page, `${route} (${theme})`);
        });
      }
    });

    test.describe("signed-in screens", () => {
      let habitId = "";

      test.beforeEach(async ({ page }) => {
        // Given: the user's saved theme is ${theme} and they own one habit, so
        // every screen renders populated content (not only empty states).
        await pinTheme(page, theme);
        await setPreferences(page, { theme, onboardingSeen: true });
        await cleanupHabits(page);
        habitId = await seedHabit(page, unique("Read one page"), "a reader");
      });

      test.afterAll(async ({ browser }, testInfo) => {
        // Leave the shared dev user on the default Light theme for other specs.
        const context = await browser.newContext({
          baseURL: testInfo.project.use.baseURL,
          storageState: "e2e/.auth/user.json",
        });
        await context.request.patch("/api/v1/reflection/preferences", { data: { theme: "light" } });
        await context.close();
      });

      const ROUTES = [
        "/",
        "/habits",
        "/habits/new",
        "HABIT_DETAIL",
        "/analytics",
        "/hall-of-fame",
        "/journal",
        "/review",
        "/identity",
        "/pet",
        "/settings",
      ];

      for (const route of ROUTES) {
        const name = route === "HABIT_DETAIL" ? "/habits/[id]" : route;
        test(`${name} has no serious or critical WCAG violations`, async ({ page }) => {
          // When: the signed-in user opens the screen
          await page.goto(route === "HABIT_DETAIL" ? `/habits/${habitId}` : route);
          await settle(page);

          // Then: the saved theme is applied and axe finds no blocking barrier
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await expectNoBlockingViolations(page, `${name} (${theme})`);
        });
      }
    });
  });
}
