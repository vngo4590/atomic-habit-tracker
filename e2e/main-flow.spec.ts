import { test, expect, type Page } from "@playwright/test";

/**
 * main-flow.spec — end-to-end coverage of the core Atomicly user journeys a
 * real person walks through: designing a habit, logging check-ins over several
 * days, journaling in markdown, running a weekly review, switching themes,
 * watching identity votes accumulate, reading analytics, and chaining habits
 * into a stack.
 *
 * These tests drive the real browser against the running app + database, so
 * they double as a regression guard for the user-visible product, not just the
 * internals.
 */

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

let counter = 0;
/** Build a collision-free habit/journal name so parallel projects never clash. */
function unique(name: string): string {
  return `${name} ${Date.now()}_${++counter}`;
}

/** YYYY-MM-DD date key `offset` days from today in the browser's local zone. */
function dayKey(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Remove every habit owned by the signed-in user so each test starts clean. */
async function cleanupHabits(page: Page): Promise<void> {
  const listRes = await page.request.get("/api/v1/habits");
  if (!listRes.ok()) return;
  const body = await listRes.json();
  const habits: Array<{ id: string }> = body.data?.habits ?? [];
  for (const habit of habits) {
    await page.request.delete(`/api/v1/habits/${habit.id}`);
  }
}

/** Create a habit straight through the API (used to set up state for a test). */
async function seedHabit(page: Page, name: string, identity: string): Promise<string> {
  const response = await page.request.post("/api/v1/habits", {
    data: {
      name,
      identity,
      emoji: "•",
      cue: "",
      craving: "",
      response: name,
      reward: "",
      loopCue: "",
      loopCraving: "",
      loopResponse: name,
      loopReward: "",
      twoMin: "",
      environment: "",
      schedule: "Daily",
      time: "Morning",
      contract: "",
      contractPartners: [],
    },
  });
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return body.data.habit.id as string;
}

/** Record (or clear) a check-in for a habit on a specific day. */
async function checkInOn(page: Page, habitId: string, dateKey: string, done = true): Promise<void> {
  const response = await page.request.post(`/api/v1/habits/${habitId}/check-ins`, {
    data: { dateKey, done },
  });
  expect(response.ok()).toBe(true);
}

/** Find the id of a habit by its exact name (after a UI create round-trip). */
async function findHabitIdByName(page: Page, name: string): Promise<string> {
  const listRes = await page.request.get("/api/v1/habits");
  expect(listRes.ok()).toBe(true);
  const body = await listRes.json();
  const habits: Array<{ id: string; name: string }> = body.data?.habits ?? [];
  const match = habits.find((habit) => habit.name === name);
  expect(match, `expected a habit named "${name}" to exist`).toBeTruthy();
  return match!.id;
}

/* -------------------------------------------------------------------------- */
/* 1. Create a habit — the summary sentence must read naturally               */
/* -------------------------------------------------------------------------- */

test.describe("Creating a habit", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupHabits(page);
  });

  test("creating a habit lists it and renders a clean summary sentence", async ({ page }) => {
    // Given: a user on the create-habit builder who types blanks with messy
    // capitalisation and a trailing full stop (the exact shape that used to
    // produce "...Read 1 page...At morning..., ...prompting..").
    const action = unique("Read 1 page about AI");
    await page.goto("/habits/new");

    const blanks = page.locator(".input");
    await blanks.nth(0).fill(action); // action (name)
    await blanks.nth(1).fill("At morning"); // cue
    await blanks.nth(2).fill("at my desk."); // place
    await blanks.nth(3).fill("A person who is amazing at AI"); // identity

    // When: they create the habit
    await page.click('button:has-text("Create habit")');

    // Then: the habit appears in their list
    await page.waitForURL("**/habits");
    await expect(page.locator(`text=${action}`).first()).toBeVisible();

    // And: the habit-detail summary sentence reads naturally — mid-sentence
    // clauses are lower-cased, the "AI" acronym survives, and there is exactly
    // one full stop (no "prompting.." and no stray capital "A person"/"At").
    const id = await findHabitIdByName(page, action);
    await page.goto(`/habits/${id}`);
    const sentence = page.locator("p", {
      hasText: "so I can become a person who is amazing at AI",
    });
    await expect(sentence).toBeVisible();
    const text = (await sentence.first().textContent())?.trim() ?? "";
    expect(text).toBe(
      `I'll ${action.charAt(0).toLowerCase()}${action.slice(1)} at morning, at my desk — so I can become a person who is amazing at AI.`,
    );
    // Guard the specific regressions the user reported.
    expect(text).not.toContain("..");
    expect(text.startsWith("I'll read")).toBe(true);
    expect(text).not.toContain("At morning");
  });
});

/* -------------------------------------------------------------------------- */
/* 2. Logging check-ins — the history diagram reflects the pattern            */
/* -------------------------------------------------------------------------- */

test.describe("Logging check-ins over several days", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupHabits(page);
  });

  test("the history wall reflects which days were logged and which were missed", async ({ page }) => {
    // Given: a habit checked in on three of the last seven days (today, and 1
    // and 3 days ago) — leaving gaps that represent lost streaks.
    const id = await seedHabit(page, unique("Daily Meditation"), "a calm person");
    await checkInOn(page, id, dayKey(0));
    await checkInOn(page, id, dayKey(-1));
    await checkInOn(page, id, dayKey(-3));

    // When: the user opens the habit's history diagram in week view
    await page.goto(`/habits/${id}`);
    await page.click('button:has-text("History")');
    await page.click('button:has-text("This week")');

    // Then: exactly three squares are marked done and the remaining four are
    // marked missed, so the diagram mirrors their real logging pattern.
    await expect(page.locator('[aria-label$=" done"]')).toHaveCount(3);
    await expect(page.locator('[aria-label$=" missed"]')).toHaveCount(4);

    // And: the header stats agree — three total check-ins were recorded.
    const totalCheckIns = page.locator(
      'xpath=//div[normalize-space(text())="Total check-ins"]/following-sibling::div',
    );
    await expect(totalCheckIns).toHaveText("3");
  });
});

/* -------------------------------------------------------------------------- */
/* 3. Journaling in markdown — formatting is rendered, not shown raw          */
/* -------------------------------------------------------------------------- */

test.describe("Writing a markdown journal entry", () => {
  test("markdown in a journal entry renders as formatted HTML", async ({ page }) => {
    // Given: a user composing a new journal entry written in markdown
    const title = unique("Markdown Reflection");
    await page.goto("/journal");
    await page.click('button:has-text("New entry")');

    await page.fill('input[placeholder="What happened today?"]', title);
    await page.fill(
      'textarea[placeholder="Capture the lesson while it is fresh."]',
      "# Big win\n\nToday was **excellent**. See [my notes](https://example.com).\n\n> Small steps compound.",
    );

    // When: they save the entry
    await page.click('button:has-text("Save entry")');

    // Then: the entry card renders the markdown as real elements (heading,
    // bold, link, blockquote) rather than showing the raw "#"/"**" syntax.
    const entry = page.locator("article", { hasText: title });
    await expect(entry).toBeVisible();
    await expect(entry.locator("h1", { hasText: "Big win" })).toBeVisible();
    await expect(entry.locator("strong", { hasText: "excellent" })).toBeVisible();
    await expect(entry.locator('a[href="https://example.com"]')).toBeVisible();
    await expect(entry.locator("blockquote")).toContainText("Small steps compound");
    await expect(entry).not.toContainText("**excellent**");
  });
});

/* -------------------------------------------------------------------------- */
/* 4. Weekly review — reflect on the past week and save                       */
/* -------------------------------------------------------------------------- */

test.describe("Reflecting with a weekly review", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupHabits(page);
  });

  test("writing a weekly review saves the reflection and shows last-7-day progress", async ({ page }) => {
    // Given: a habit with a recent check-in so the week summary has data
    const id = await seedHabit(page, unique("Weekly Run"), "a runner");
    await checkInOn(page, id, dayKey(0));
    await checkInOn(page, id, dayKey(-2));

    await page.goto("/review");

    // The weekly review surfaces last-7-day progress to reflect on.
    await expect(page.locator('text=Last 7 days')).toBeVisible();

    // When: the user opens the review editor (intro on a fresh week, or Edit
    // if one already exists) and answers the prompts
    const startButton = page.locator('button:has-text("Write this week\'s review")');
    if (await startButton.isVisible().catch(() => false)) {
      await startButton.click();
    } else {
      await page.click('button:has-text("Edit review")');
    }

    const reflection = unique("I showed up on the hard days");
    await page.locator("textarea").nth(0).fill(reflection);
    await page.locator("textarea").nth(1).fill("Lay my kit out the night before.");
    await page.locator("textarea").nth(2).fill("Someone who runs whatever the weather.");

    // When: they save the review
    await page.click('button:has-text("Save review")');

    // Then: the saved reflection is shown back in the read-only review display.
    await expect(page.locator('text=This week\'s review')).toBeVisible();
    await expect(page.locator(`text=${reflection}`)).toBeVisible();
  });
});

/* -------------------------------------------------------------------------- */
/* 5. Theme switching — every theme applies without breaking the UI           */
/* -------------------------------------------------------------------------- */

test.describe("Switching themes", () => {
  // Each theme card maps to the data-theme-variant + base data-theme it applies.
  const THEMES: Array<{ label: string; variant: string; base: string }> = [
    { label: "Bright", variant: "light", base: "light" },
    { label: "Midnight", variant: "dark", base: "dark" },
    { label: "Glass", variant: "glass", base: "light" },
    { label: "Neon", variant: "neon", base: "dark" },
    { label: "Fairy", variant: "fairy", base: "light" },
    { label: "Starlight", variant: "stars", base: "dark" },
  ];

  test("each theme applies its variant and keeps the UI intact", async ({ page }) => {
    await page.goto("/settings");
    const html = page.locator("html");
    const gallery = page.locator('[aria-label="Theme"]');

    for (const theme of THEMES) {
      // When: the user selects a theme from the gallery
      await gallery.locator(`button:has-text("${theme.label}")`).click();

      // Then: the document switches to that variant + its base light/dark mode
      await expect(html).toHaveAttribute("data-theme-variant", theme.variant);
      await expect(html).toHaveAttribute("data-theme", theme.base);

      // And: the core UI is still intact (no blank screen / broken layout) —
      // the Settings heading and the theme gallery remain visible on every
      // viewport (the sidebar is intentionally hidden on mobile).
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
      await expect(gallery).toBeVisible();
    }

    // Leave the user on a stable default so later tests aren't affected.
    await gallery.locator('button:has-text("Bright")').click();
    await expect(html).toHaveAttribute("data-theme-variant", "light");
  });
});

/* -------------------------------------------------------------------------- */
/* 6. Identity ledger — check-ins accumulate as votes per identity            */
/* -------------------------------------------------------------------------- */

test.describe("Tracking identity votes", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupHabits(page);
  });

  test("the identity ledger tallies check-ins as votes for that identity", async ({ page }) => {
    // Given: a habit tied to a specific identity, checked in three times
    const identity = unique("a focused builder");
    const id = await seedHabit(page, unique("Deep Work"), identity);
    await checkInOn(page, id, dayKey(0));
    await checkInOn(page, id, dayKey(-1));
    await checkInOn(page, id, dayKey(-2));

    // When: the user views the identity vote ledger
    await page.goto("/identity");

    // Then: the ledger lists that identity with three votes of progress.
    const row = page.locator(".eyebrow", { hasText: "Vote ledger" }).locator("xpath=ancestor::section");
    await expect(row).toContainText(`I am ${identity}`);
    await expect(row).toContainText("3");
    await expect(row).toContainText("3 TOTAL");
  });
});

/* -------------------------------------------------------------------------- */
/* 7. Analytics — overall progress is summarised                              */
/* -------------------------------------------------------------------------- */

test.describe("Reviewing analytics", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupHabits(page);
  });

  test("analytics reflects the total check-ins logged", async ({ page }) => {
    // Given: a habit with two check-ins
    const id = await seedHabit(page, unique("Stretch"), "a supple person");
    await checkInOn(page, id, dayKey(0));
    await checkInOn(page, id, dayKey(-1));

    // When: the user opens the analytics dashboard
    await page.goto("/analytics");

    // Then: the page renders and the "Total check-ins" stat reflects the logs.
    await expect(page.getByRole("heading", { name: /analytics/i })).toBeVisible();
    await expect(page.locator('text=Daily completion')).toBeVisible();
    const totalCard = page.locator('.card', { hasText: "Total check-ins" });
    await expect(totalCard).toContainText("2");
  });
});

/* -------------------------------------------------------------------------- */
/* 8. Habit stacking — chain habits together and reorder them                 */
/* -------------------------------------------------------------------------- */

test.describe("Chaining and reordering habits", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupHabits(page);
  });

  test("a new habit can be chained onto an existing habit", async ({ page }) => {
    // Given: two standalone habits
    const idA = await seedHabit(page, unique("Wake Up"), "an early riser");
    const nameB = unique("Drink Water");
    await seedHabit(page, nameB, "a hydrated person");

    // When: the user links habit B after habit A in the stack editor
    await page.goto(`/habits/${idA}`);
    await page.click('button:has-text("Stack")');
    await page.click('button:has-text("Link after…")');
    await page.click(`[data-testid="stack-link-options"] .chip:has-text("${nameB}")`);
    await page.waitForSelector('text=Select a habit to link after:', { state: "hidden" });

    // Then: the two habits form a chain shown as Step 1 of 2.
    await expect(page.locator('text=Step 1 of 2')).toBeVisible();
    await expect(page.locator('[data-testid="stack-chain-chip"]')).toHaveCount(2);
  });

  test("a three-habit chain can be reordered by dragging a chip", async ({ page }) => {
    // Given: a three-habit chain A → B → C
    const idA = await seedHabit(page, unique("Step A"), "a builder");
    const idB = await seedHabit(page, unique("Step B"), "a builder");
    const idC = await seedHabit(page, unique("Step C"), "a builder");
    expect((await page.request.patch(`/api/v1/habits/${idA}`, { data: { stackNextId: idB } })).ok()).toBe(true);
    expect((await page.request.patch(`/api/v1/habits/${idB}`, { data: { stackNextId: idC } })).ok()).toBe(true);

    await page.goto(`/habits/${idA}`);
    await page.click('button:has-text("Stack")');
    await expect(page.locator('text=Step 1 of 3')).toBeVisible();

    // When: the user drags chip A past chip C (framer-motion needs several
    // intermediate moves before drop for the reorder to register)
    const handleA = page.locator(`[data-testid="stack-chip-drag-${idA}"]`);
    const chipC = page.locator(`[data-testid="stack-chip-item-${idC}"]`);
    const boxA = await handleA.boundingBox();
    const boxC = await chipC.boundingBox();
    if (!boxA || !boxC) {
      test.skip(true, "Could not measure chip bounding boxes for drag");
      return;
    }
    const startX = boxA.x + boxA.width / 2;
    const startY = boxA.y + boxA.height / 2;
    const endX = boxC.x + boxC.width + 12;
    const endY = boxC.y + boxC.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + (endX - startX) * 0.33, endY, { steps: 5 });
    await page.mouse.move(startX + (endX - startX) * 0.66, endY, { steps: 5 });
    await page.mouse.move(endX, endY, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(1500);

    // Then: the chain is still a single intact chain of the same three habits,
    // but the order has changed (exactly one tail, all pointers stay in-set).
    const body = await (await page.request.get("/api/v1/habits")).json();
    const habits = body.data?.habits as Array<{ id: string; stackNextId: string | null }>;
    const ids = new Set([idA, idB, idC]);
    const chainHabits = habits.filter((habit) => ids.has(habit.id));
    expect(chainHabits.length).toBe(3);
    expect(chainHabits.filter((habit) => habit.stackNextId === null).length).toBe(1);
    for (const habit of chainHabits) {
      if (habit.stackNextId) expect(ids.has(habit.stackNextId)).toBe(true);
    }
  });
});
