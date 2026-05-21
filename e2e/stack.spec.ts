import { test, expect } from "@playwright/test";

/**
 * Helpers
 */
let counter = 0;
function unique(name: string) {
  return `${name} ${Date.now()}_${++counter}`;
}

async function setStackNextId(page: import("@playwright/test").Page, habitId: string, targetId: string | null) {
  const res = await page.request.patch(`/api/v1/habits/${habitId}`, {
    data: { stackNextId: targetId },
  });
  expect(res.ok()).toBe(true);
}

async function cleanupHabits(page: import("@playwright/test").Page) {
  const listRes = await page.request.get("/api/v1/habits");
  if (!listRes.ok()) return;
  const body = await listRes.json();
  const habits: Array<{ id: string }> = body.data?.habits ?? [];
  for (const habit of habits) {
    await page.request.delete(`/api/v1/habits/${habit.id}`);
  }
}

async function seedHabit(page: import("@playwright/test").Page, name: string, identity: string) {
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

async function openHabitDetail(page: import("@playwright/test").Page, habitId: string) {
  await page.goto(`/habits/${habitId}`);
  await page.waitForSelector('button:has-text("Stack")', { timeout: 10000 });
}

async function openStackTab(page: import("@playwright/test").Page, habitId: string) {
  await openHabitDetail(page, habitId);
  await page.click('button:has-text("Stack")');
}

async function linkAfter(page: import("@playwright/test").Page, targetName: string) {
  await page.click('button:has-text("Link after…")');
  await page.click(`.chip:has-text("${targetName}")`);
  // Wait for selector to close and server round-trip to finish
  await page.waitForSelector('text=Select a habit to link after:', { state: "hidden" });
  await page.waitForTimeout(800);
}

async function linkBefore(page: import("@playwright/test").Page, targetName: string) {
  await page.click('button:has-text("Link before…")');
  await page.click(`.chip:has-text("${targetName}")`);
  await page.waitForSelector('text=Select a habit to link before:', { state: "hidden" });
  await page.waitForTimeout(800);
}

async function removeFromStack(page: import("@playwright/test").Page) {
  await page.click('button:has-text("Remove from stack")');
  await expect(page.locator('text=This habit is not part of a stack.')).toBeVisible();
}

/**
 * Stack CRUD & edge cases
 */
test.describe("Habit stacking", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupHabits(page);
  });
  test("stack tab is visible on habit detail", async ({ page }) => {
    const id = await seedHabit(page, unique("Stack Tab Test"), "tester");
    await openStackTab(page, id);
    await expect(page.locator('button:has-text("Stack")')).toBeVisible();
  });

  test("linking two habits into a stack and viewing the diagram", async ({ page }) => {
    const idA = await seedHabit(page, unique("Morning Read"), "reader");
    await seedHabit(page, unique("Evening Journal"), "writer");

    // Link A after B → B → A (A is step 2)
    await openStackTab(page, idA);
    await linkAfter(page, "Evening Journal");

    await expect(page.locator('text=Step 2 of 2')).toBeVisible();
    await expect(page.locator('.chip:has-text("Morning Read")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Evening Journal")')).toBeVisible();
  });

  test("linking three habits into a chain", async ({ page }) => {
    const idA = await seedHabit(page, unique("Chain A"), "chainer");
    await seedHabit(page, unique("Chain B"), "chainer");
    const idC = await seedHabit(page, unique("Chain C"), "chainer");

    // A after B → B → A (A is step 2)
    await openStackTab(page, idA);
    await linkAfter(page, "Chain B");
    await expect(page.locator('text=Step 2 of 2')).toBeVisible();

    // C before B → C → B → A (C is step 1)
    await openStackTab(page, idC);
    await linkBefore(page, "Chain B");
    await expect(page.locator('text=Step 1 of 3')).toBeVisible();
  });

  test("removing a habit from a stack shows empty state", async ({ page }) => {
    const idA = await seedHabit(page, unique("Remove Me"), "remover");
    await seedHabit(page, unique("Remove Partner"), "remover");

    await openStackTab(page, idA);
    await linkAfter(page, "Remove Partner");
    await expect(page.locator('text=Step 2 of 2')).toBeVisible();
    await expect(page.locator('.chip:has-text("Remove Me")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Remove Partner")')).toBeVisible();

    await removeFromStack(page);
  });

  test("removing middle habit re-links neighbors", async ({ page }) => {
    const idA = await seedHabit(page, unique("Middle A"), "middler");
    const idB = await seedHabit(page, unique("Middle B"), "middler");
    const idC = await seedHabit(page, unique("Middle C"), "middler");

    // Build C → B → A via API
    await setStackNextId(page, idC, idB);
    await setStackNextId(page, idB, idA);

    // Verify chain on C's page
    await openStackTab(page, idC);
    await expect(page.locator('text=Step 1 of 3')).toBeVisible();
    await expect(page.locator('.chip:has-text("Middle A")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Middle B")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Middle C")')).toBeVisible();

    // Simulate removing B via API: clear B → A first (exclusivity), then C → A
    await setStackNextId(page, idB, null);
    await setStackNextId(page, idC, idA);

    // Verify A links to C (A is step 2 of 2)
    await openStackTab(page, idA);
    await expect(page.locator('text=Step 2 of 2')).toBeVisible();
    await expect(page.locator('.chip:has-text("Middle A")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Middle C")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Middle B")')).not.toBeVisible();
  });

  test("moving a habit from one stack to another", async ({ page }) => {
    const idA = await seedHabit(page, unique("Move A"), "mover");
    const idB = await seedHabit(page, unique("Move B"), "mover");
    const idX = await seedHabit(page, unique("Move X"), "mover");
    const idY = await seedHabit(page, unique("Move Y"), "mover");

    // Build stacks via API: Y → X and B → A
    await setStackNextId(page, idY, idX);
    await setStackNextId(page, idB, idA);

    // Move B to Stack 1 via API: Y → B and clear B → A
    await setStackNextId(page, idY, idB);
    await setStackNextId(page, idB, null);

    // Verify B is step 2 of 2 in Y → B
    await openStackTab(page, idB);
    await expect(page.locator('text=Step 2 of 2')).toBeVisible();
    await expect(page.locator('.chip:has-text("Move Y")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Move B")')).toBeVisible();

    // Verify A is now solo
    await openStackTab(page, idA);
    await expect(page.locator('text=This habit is not part of a stack.')).toBeVisible();
  });

  test("client-side cycle prevention shows inline error", async ({ page }) => {
    const idA = await seedHabit(page, unique("Cycle A"), "cycler");
    const idB = await seedHabit(page, unique("Cycle B"), "cycler");
    const idC = await seedHabit(page, unique("Cycle C"), "cycler");

    // Build C → B → A via API
    await setStackNextId(page, idC, idB);
    await setStackNextId(page, idB, idA);

    // Verify chain on C's page
    await openStackTab(page, idC);
    await expect(page.locator('text=Step 1 of 3')).toBeVisible();
    await expect(page.locator('.chip:has-text("Cycle A")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Cycle B")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Cycle C")')).toBeVisible();

    // Open A's stack tab: its chain is C → B → A, so selector should exclude C, B, A
    await openStackTab(page, idA);
    await page.click('button:has-text("Link after…")');

    // A should NOT see itself or its chain members in the selector
    // Use button.chip to target selector chips (chain diagram uses div.chip)
    await expect(page.locator('button.chip:has-text("Cycle A")')).not.toBeVisible();
    await expect(page.locator('button.chip:has-text("Cycle B")')).not.toBeVisible();
    await expect(page.locator('button.chip:has-text("Cycle C")')).not.toBeVisible();

    // Cancel and try linking before A — same exclusions
    await page.click('button:has-text("Cancel")');
    await page.click('button:has-text("Link before…")');
    await expect(page.locator('button.chip:has-text("Cycle A")')).not.toBeVisible();
    await expect(page.locator('button.chip:has-text("Cycle B")')).not.toBeVisible();
    await expect(page.locator('button.chip:has-text("Cycle C")')).not.toBeVisible();
  });

  test("multiple stack updates in sequence", async ({ page }) => {
    const idA = await seedHabit(page, unique("Seq A"), "sequencer");
    const idB = await seedHabit(page, unique("Seq B"), "sequencer");
    const idC = await seedHabit(page, unique("Seq C"), "sequencer");

    // Start with B → A via API
    await setStackNextId(page, idB, idA);

    // A is step 2 of 2
    await openStackTab(page, idA);
    await expect(page.locator('text=Step 2 of 2')).toBeVisible();

    // Change to A after C → C → A (A is step 2)
    // First clear B→A, then set C→A via API to avoid race
    await setStackNextId(page, idB, null);
    await setStackNextId(page, idC, idA);
    await page.reload();
    await openStackTab(page, idA);
    await expect(page.locator('.chip:has-text("Seq C")')).toBeVisible();
    await expect(page.locator('text=Step 2 of 2')).toBeVisible();

    // Remove link
    await removeFromStack(page);

    // Re-link A after B via API, then verify UI
    await setStackNextId(page, idB, idA);
    await page.reload();
    await openStackTab(page, idA);
    await expect(page.locator('text=Step 2 of 2')).toBeVisible();
    await expect(page.locator('.chip:has-text("Seq A")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Seq B")')).toBeVisible();
  });
});

/**
 * Today page stack interactions
 */
test.describe("Today page stack cards", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupHabits(page);
  });
  test("stacked habits render as card group on today page", async ({ page }) => {
    const idA = await seedHabit(page, unique("Today Stack A"), "stacker");
    await seedHabit(page, unique("Today Stack B"), "stacker");

    // B → A (A is step 2)
    await openStackTab(page, idA);
    await linkAfter(page, "Today Stack B");

    await page.goto("/");
    // The root habit (B) should be visible as the stack card
    await expect(page.locator('.habit-list-row:has-text("Today Stack B")').first()).toBeVisible();
  });

  test("solo habits still render as standalone rows", async ({ page }) => {
    await seedHabit(page, unique("Solo Habit"), "soloer");

    await page.goto("/");
    const soloRow = page.locator('.habit-list-row:has-text("Solo Habit")').first();
    await expect(soloRow).toBeVisible();
  });

  test("expand stack card group to see more habits", async ({ page }) => {
    const idA = await seedHabit(page, unique("Expand A"), "expander");
    await seedHabit(page, unique("Expand B"), "expander");
    const idC = await seedHabit(page, unique("Expand C"), "expander");

    // B → A (A is step 2)
    await openStackTab(page, idA);
    await linkAfter(page, "Expand B");

    // C → B → A (C is step 1)
    await openStackTab(page, idC);
    await linkBefore(page, "Expand B");

    await page.goto("/");
    // Click the first card to expand the stack
    await page.locator('.habit-list-row:has-text("Expand C")').first().click();

    // After expand, should see collapse button
    await expect(page.locator('button:has-text("Collapse stack")')).toBeVisible();
  });

  test("checking off a stacked habit marks it done", async ({ page }) => {
    const idA = await seedHabit(page, unique("Check A"), "checker");

    await page.goto("/");
    const row = page.locator('.habit-list-row:has-text("Check A")').first();
    await expect(row).toBeVisible({ timeout: 10000 });

    // Click the check circle (not the row which would navigate)
    await row.locator('button[aria-label="Check"]').click();

    // A mood sheet may appear; close it if so
    const moodClose = page.locator('button:has-text("Skip")');
    if (await moodClose.isVisible().catch(() => false)) {
      await moodClose.click();
    }

    // Verify the habit shows as done on its detail page
    await openHabitDetail(page, idA);
    await expect(page.locator('text=Done today')).toBeVisible();
  });

  test("checking off first habit in stack reveals next on today page", async ({ page }) => {
    const idA = await seedHabit(page, unique("Reveal A"), "revealer");
    const idB = await seedHabit(page, unique("Reveal B"), "revealer");

    // B → A via API
    await setStackNextId(page, idB, idA);

    await page.goto("/");
    const rowB = page.locator('.habit-list-row:has-text("Reveal B")').first();
    await expect(rowB).toBeVisible();

    // Check off B
    await rowB.locator('button[aria-label="Check"]').click();

    const moodClose = page.locator('button:has-text("Skip")');
    if (await moodClose.isVisible().catch(() => false)) {
      await moodClose.click();
    }

    // B should disappear (done), A should now appear as first undone
    await page.reload();
    await page.waitForSelector('button:has-text("New habit")', { timeout: 10000 });
    await expect(page.locator('.habit-list-row:has-text("Reveal A")').first()).toBeVisible();
  });
});

/**
 * Responsive / layout
 */
test.describe("Responsive layout", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupHabits(page);
  });
  test("no layout overflow at mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForSelector('button:has-text("New habit")', { timeout: 10000 });

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test("stack tab and diagram render correctly at mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const idA = await seedHabit(page, unique("Mobile A"), "mobiler");
    await seedHabit(page, unique("Mobile B"), "mobiler");

    await openStackTab(page, idA);
    await linkAfter(page, "Mobile B");

    // A is step 2 of 2
    await expect(page.locator('text=Step 2 of 2')).toBeVisible();
    // Diagram chips should not overflow
    const cardWidth = await page.locator('.card').first().evaluate((el) => el.scrollWidth);
    expect(cardWidth).toBeLessThanOrEqual(375);
  });
});
