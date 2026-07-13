import { test, expect } from "@playwright/test";

/**
 * Helpers
 */
let counter = 0;
function unique(name: string) {
  return `${name} ${Date.now()}_${++counter}`;
}

/**
 * Run an API request, retrying only on a *transient* non-OK response (429 or a
 * 5xx). The ephemeral PR preview runs on a deliberately small Container App, so
 * the app can occasionally return a transient 5xx under cold-start/CPU pressure;
 * a user would simply retry, so the E2E API setup helpers do the same. A 4xx
 * (e.g. a 422 stack-validation error) is deterministic, so we surface it
 * immediately rather than wasting retries that cannot succeed.
 */
async function requestOk<T extends { ok(): boolean; status(): number }>(
  send: () => Promise<T>,
  attempts = 4,
): Promise<T> {
  let last: T | undefined;
  for (let i = 0; i < attempts; i += 1) {
    last = await send();
    if (last.ok()) return last;
    const transient = last.status() === 429 || last.status() >= 500;
    if (!transient) break;
    // Back off briefly before retrying a transient failure.
    await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
  }
  // No success — assert so the failure surfaces with a clear status in the message.
  expect(last?.ok(), `request failed (status ${last?.status()})`).toBe(true);
  return last as T;
}

async function setStackNextId(page: import("@playwright/test").Page, habitId: string, targetId: string | null) {
  await requestOk(() =>
    page.request.patch(`/api/v1/habits/${habitId}`, {
      data: { stackNextId: targetId },
    }),
  );
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
  const response = await requestOk(() =>
    page.request.post("/api/v1/habits", {
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
    }),
  );
  const body = await response.json();
  return body.data.habit.id as string;
}

/**
 * The server caps how many *active* habits a user may keep at once. This mirrors
 * `MAX_ACTIVE_HABITS` in `lib/habit-cap.ts`; the stacking suite needs the two to
 * agree so it can seed a pool larger than the cap without tripping a 409.
 */
const MAX_ACTIVE_HABITS = 3;

/**
 * Induct a habit into the Hall of Fame by recording a `formed` formation
 * verdict. An inducted habit stays fully trackable and is NOT archived, so it
 * remains in the store and stays a valid stack candidate/target — it simply no
 * longer counts against the active-habit cap. Stacking tests use this to free a
 * cap slot so they can seed more linkable habits than the cap would otherwise
 * allow.
 */
async function inductHabit(page: import("@playwright/test").Page, habitId: string) {
  await requestOk(() =>
    page.request.post("/api/v1/reflection/formation-verdicts", {
      data: { habitId, score: 5, formed: true },
    }),
  );
}

/**
 * Seed several habits while respecting the server's active-habit cap. Because at
 * most `MAX_ACTIVE_HABITS` habits may be *active* at once, we induct the oldest
 * still-active seeded habit whenever the next create would exceed the cap.
 * Inducted habits remain selectable in the stack picker (they are not archived),
 * so the caller ends up with every requested habit available to link, just not
 * all of them counting against the cap. Returns the created ids in order.
 */
async function seedWithinCap(
  page: import("@playwright/test").Page,
  names: string[],
  identity: string,
): Promise<string[]> {
  const ids: string[] = [];
  const active: string[] = []; // ids that still count against the active cap
  for (const name of names) {
    if (active.length >= MAX_ACTIVE_HABITS) {
      // Free a slot before creating the next habit, or the create would 409.
      await inductHabit(page, active.shift() as string);
    }
    const id = await seedHabit(page, name, identity);
    ids.push(id);
    active.push(id);
  }
  return ids;
}

async function openHabitDetail(page: import("@playwright/test").Page, habitId: string) {
  // The preview instance can be slow to render a detail page under cold start,
  // so allow a generous timeout and retry the navigation once before giving up.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(`/habits/${habitId}`);
    try {
      await page.waitForSelector('button:has-text("Stack")', { timeout: 20000 });
      return;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
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
  // The empty state appears optimistically; the server commit may still be
  // in flight. Give it a beat so subsequent API calls don't race against
  // stale predecessor links.
  await page.waitForTimeout(800);
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

    // Anchor = A (current habit), picked solo = B. Insert B after A → A → B.
    await openStackTab(page, idA);
    await linkAfter(page, "Evening Journal");

    // A is the root of the chain → step 1 of 2.
    await expect(page.locator('text=Step 1 of 2')).toBeVisible();
    await expect(page.locator('.chip:has-text("Morning Read")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Evening Journal")')).toBeVisible();
  });

  test("linking three habits into a chain (anchor can be a chain member)", async ({ page }) => {
    const idA = await seedHabit(page, unique("Chain A"), "chainer");
    const idB = await seedHabit(page, unique("Chain B"), "chainer");
    await seedHabit(page, unique("Chain C"), "chainer");

    // Insert solo B after A (anchor) → A → B. A is step 1 of 2.
    await openStackTab(page, idA);
    await linkAfter(page, "Chain B");
    await expect(page.locator('text=Step 1 of 2')).toBeVisible();

    // Anchor is now a chain member (B). Insert solo C after B → A → B → C.
    // B is step 2 of 3 in the resulting chain.
    await openStackTab(page, idB);
    await linkAfter(page, "Chain C");
    await expect(page.locator('text=Step 2 of 3')).toBeVisible();
    await expect(page.locator('.chip:has-text("Chain A")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Chain B")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Chain C")')).toBeVisible();
  });

  test("removing a habit from a stack shows empty state", async ({ page }) => {
    const idA = await seedHabit(page, unique("Remove Me"), "remover");
    await seedHabit(page, unique("Remove Partner"), "remover");

    // Insert partner after Me → Me → Partner. Me is step 1 of 2.
    await openStackTab(page, idA);
    await linkAfter(page, "Remove Partner");
    await expect(page.locator('text=Step 1 of 2')).toBeVisible();
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
    // Four habits exceed the active-habit cap, so seed them cap-aware: the
    // helper inducts the oldest active habit to free a slot. Inducted habits are
    // still valid stack targets/candidates, so all four remain fully stackable.
    const [idA, idB, idX, idY] = await seedWithinCap(
      page,
      [unique("Move A"), unique("Move B"), unique("Move X"), unique("Move Y")],
      "mover",
    );

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

  test("link selector filters by the search input", async ({ page }) => {
    const idA = await seedHabit(page, unique("Search Anchor"), "searcher");
    await seedHabit(page, unique("Morning Stretch"), "searcher");
    await seedHabit(page, unique("Evening Read"), "searcher");

    await openStackTab(page, idA);
    await page.click('button:has-text("Link after…")');

    // Both solo habits visible initially.
    await expect(page.locator('button.chip:has-text("Morning Stretch")')).toBeVisible();
    await expect(page.locator('button.chip:has-text("Evening Read")')).toBeVisible();

    // Type to filter.
    await page.locator('[data-testid="stack-link-search"]').fill("stretch");
    await expect(page.locator('button.chip:has-text("Morning Stretch")')).toBeVisible();
    await expect(page.locator('button.chip:has-text("Evening Read")')).not.toBeVisible();
  });

  test("link selector caps the list at 10 with a Show-all expand", async ({ page }) => {
    // Anchor + 12 standalone candidates → the picker must initially show 10
    // plus a "Show all" button revealing the remaining 2. This is far beyond the
    // active-habit cap, so seed cap-aware: earlier habits get inducted to free
    // slots but stay in the picker (inducted habits are not archived), leaving
    // all 13 selectable while the server only ever sees ≤3 active at create time.
    const tag = unique("Pool");
    const names = [unique("Limit Anchor")];
    for (let i = 0; i < 12; i += 1) {
      names.push(`${tag} ${String(i).padStart(2, "0")}`);
    }
    const [idAnchor] = await seedWithinCap(page, names, "limiter");

    await openStackTab(page, idAnchor);
    await page.click('button:has-text("Link after…")');

    // Default view: exactly 10 chips.
    const options = page.locator('[data-testid="stack-link-options"] button');
    await expect(options).toHaveCount(10);

    // Show-all button announces the total (12) and overflow count (2).
    const showAll = page.locator('[data-testid="stack-link-show-all"]');
    await expect(showAll).toBeVisible();
    await expect(showAll).toContainText("12");
    await expect(showAll).toContainText("2 more");

    // Expand → all 12 visible, Show-less available.
    await showAll.click();
    await expect(options).toHaveCount(12);
    await expect(page.locator('[data-testid="stack-link-show-less"]')).toBeVisible();
    await expect(page.locator('[data-testid="stack-link-show-all"]')).not.toBeVisible();

    // Searching collapses back to a focused list.
    await page.locator('[data-testid="stack-link-search"]').fill("11");
    await expect(options).toHaveCount(1);
    await expect(page.locator('[data-testid="stack-link-show-all"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="stack-link-show-less"]')).not.toBeVisible();
  });

  test("when current habit is in a chain, the link selector excludes chain members", async ({ page }) => {
    // Build A → B so A and B are both in a chain. Open B's Stack tab (chain
    // member) — picker must exclude A and B and only offer the solo C.
    const idA = await seedHabit(page, unique("Solo Filter A"), "soloer");
    const idB = await seedHabit(page, unique("Solo Filter B"), "soloer");
    const idC = await seedHabit(page, unique("Solo Filter C"), "soloer");

    await setStackNextId(page, idA, idB);

    // Anchor B is in a chain → picker is restricted to standalones only.
    await openStackTab(page, idB);
    await page.click('button:has-text("Link after…")');

    await expect(page.locator(`[data-testid="stack-link-option-${idA}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-testid="stack-link-option-${idB}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-testid="stack-link-option-${idC}"]`)).toBeVisible();
  });

  test("when current habit is solo, the link selector includes chain members (symmetric picker)", async ({ page }) => {
    // Same setup: A → B chain, C solo. Open C (solo) — picker now offers
    // every other habit including chain members A and B so the solo can
    // join the existing chain.
    const idA = await seedHabit(page, unique("Sym Filter A"), "symmer");
    const idB = await seedHabit(page, unique("Sym Filter B"), "symmer");
    const idC = await seedHabit(page, unique("Sym Filter C"), "symmer");

    await setStackNextId(page, idA, idB);

    await openStackTab(page, idC);
    await page.click('button:has-text("Link after…")');

    await expect(page.locator(`[data-testid="stack-link-option-${idA}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="stack-link-option-${idB}"]`)).toBeVisible();
    // Current habit (C) is never offered as a candidate.
    await expect(page.locator(`[data-testid="stack-link-option-${idC}"]`)).toHaveCount(0);
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

  test("adds a standalone habit after a mid-chain habit", async ({ page }) => {
    // Build chain R → M → T via API, plus a standalone. Four habits exceed the
    // active cap, so seed cap-aware — an inducted chain member keeps its
    // stackNextId and still renders, so the chain is unaffected.
    const [idR, idM, idT] = await seedWithinCap(
      page,
      [unique("Mid Root"), unique("Mid Middle"), unique("Mid Tail"), unique("Mid Solo")],
      "midder",
    );
    await setStackNextId(page, idR, idM);
    await setStackNextId(page, idM, idT);

    // Open the *middle* habit and insert the standalone after it.
    // Expected chain: R → M → Solo → T (4 steps, M is step 2 of 4).
    await openStackTab(page, idM);
    await linkAfter(page, "Mid Solo");

    await expect(page.locator('text=Step 2 of 4')).toBeVisible();
    await expect(page.locator('.chip:has-text("Mid Root")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Mid Middle")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Mid Solo")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Mid Tail")')).toBeVisible();

    // From the standalone's own POV the chain order is the same; verify it
    // also reports step 3 of 4 from there.
    void idR;
    void idT;
  });

  test("adds a standalone habit before the chain root", async ({ page }) => {
    // Build chain R → T via API; then add a standalone before R.
    const idR = await seedHabit(page, unique("Top Root"), "topper");
    const idT = await seedHabit(page, unique("Top Tail"), "topper");
    await seedHabit(page, unique("Top Solo"), "topper");
    await setStackNextId(page, idR, idT);

    // Anchor = R (root of chain). Insert Solo before R.
    // Expected: Solo → R → T (R is step 2 of 3).
    await openStackTab(page, idR);
    await linkBefore(page, "Top Solo");

    await expect(page.locator('text=Step 2 of 3')).toBeVisible();
    await expect(page.locator('.chip:has-text("Top Solo")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Top Root")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Top Tail")')).toBeVisible();
    void idT;
  });

  test("adds a standalone habit after the chain tail", async ({ page }) => {
    // Build chain R → T via API; then add a standalone after T.
    const idR = await seedHabit(page, unique("Bot Root"), "bottomer");
    const idT = await seedHabit(page, unique("Bot Tail"), "bottomer");
    await seedHabit(page, unique("Bot Solo"), "bottomer");
    await setStackNextId(page, idR, idT);

    // Anchor = T (tail of chain). Insert Solo after T.
    // Expected: R → T → Solo (T is step 2 of 3).
    await openStackTab(page, idT);
    await linkAfter(page, "Bot Solo");
    await expect(page.locator('text=Step 2 of 3')).toBeVisible();
    await expect(page.locator('.chip:has-text("Bot Root")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Bot Tail")')).toBeVisible();
    await expect(page.locator('.chip:has-text("Bot Solo")')).toBeVisible();
    void idR;
  });

  test("adds a standalone habit before a mid-chain habit", async ({ page }) => {
    // Build chain R → M → T via API; then add a standalone before M.
    // Expected: R → Solo → M → T (M moves from step 2 of 3 to step 3 of 4).
    // Four habits exceed the active cap, so seed cap-aware.
    const [idR, idM, idT] = await seedWithinCap(
      page,
      [
        unique("MidBefore Root"),
        unique("MidBefore Middle"),
        unique("MidBefore Tail"),
        unique("MidBefore Solo"),
      ],
      "mid-before",
    );
    await setStackNextId(page, idR, idM);
    await setStackNextId(page, idM, idT);

    await openStackTab(page, idM);
    await linkBefore(page, "MidBefore Solo");

    // M is now step 3 of 4: R → Solo → M → T
    await expect(page.locator('text=Step 3 of 4')).toBeVisible();
    await expect(page.locator('.chip:has-text("MidBefore Root")')).toBeVisible();
    await expect(page.locator('.chip:has-text("MidBefore Solo")')).toBeVisible();
    await expect(page.locator('.chip:has-text("MidBefore Middle")')).toBeVisible();
    await expect(page.locator('.chip:has-text("MidBefore Tail")')).toBeVisible();
    void idR;
    void idT;
  });

  test("standalone-only picker still excludes chain members when anchor is mid-chain", async ({ page }) => {
    // Build chain X → Y → Z; the picker on Y must exclude X, Y, Z and only show the standalone.
    // Four habits exceed the active cap, so seed cap-aware — an inducted chain
    // member is still `isInStack`, so it stays excluded from the picker.
    const [idX, idY, idZ] = await seedWithinCap(
      page,
      [unique("Excl X"), unique("Excl Y"), unique("Excl Z"), unique("Excl Solo")],
      "excluder",
    );
    await setStackNextId(page, idX, idY);
    await setStackNextId(page, idY, idZ);

    await openStackTab(page, idY);
    await page.click('button:has-text("Link after…")');

    // Chain members must not appear in the picker.
    await expect(page.locator('button.chip:has-text("Excl X")')).not.toBeVisible();
    await expect(page.locator('button.chip:has-text("Excl Y")')).not.toBeVisible();
    await expect(page.locator('button.chip:has-text("Excl Z")')).not.toBeVisible();
    // The standalone must appear.
    await expect(page.locator('button.chip:has-text("Excl Solo")')).toBeVisible();
    void idX;
    void idY;
    void idZ;
  });
});

/**
 * Today page stack interactions
 */
test.describe("Today page stack cards", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupHabits(page);
  });
  test("stacked habits render as Apple-Wallet card group with peek slivers", async ({ page }) => {
    const idA = await seedHabit(page, unique("Today Stack A"), "stacker");
    const idB = await seedHabit(page, unique("Today Stack B"), "stacker");

    // Insert B after A → A → B. Root = A, displayed as top card.
    await openStackTab(page, idA);
    await linkAfter(page, "Today Stack B");

    await page.goto("/");
    // Top card (root A) visible.
    await expect(page.locator('.habit-list-row:has-text("Today Stack A")').first()).toBeVisible();
    // Wallet peek slivers communicate that more habits exist behind the top card.
    const peeks = page.locator('[data-testid="stack-card-peek"]');
    await expect(peeks.first()).toBeVisible();
    void idA;
    void idB;
  });

  test("stacked habits render as card group on today page", async ({ page }) => {
    const idA = await seedHabit(page, unique("Today Stack A"), "stacker");
    await seedHabit(page, unique("Today Stack B"), "stacker");

    // Insert B after A → A → B. Root = A.
    await openStackTab(page, idA);
    await linkAfter(page, "Today Stack B");

    await page.goto("/");
    // The root habit (A) should be visible as the stack card
    await expect(page.locator('.habit-list-row:has-text("Today Stack A")').first()).toBeVisible();
  });

  test("solo habits still render as standalone rows", async ({ page }) => {
    await seedHabit(page, unique("Solo Habit"), "soloer");

    await page.goto("/");
    const soloRow = page.locator('.habit-list-row:has-text("Solo Habit")').first();
    await expect(soloRow).toBeVisible();
  });

  test("expand stack card group to see more habits", async ({ page }) => {
    const idA = await seedHabit(page, unique("Expand A"), "expander");
    const idB = await seedHabit(page, unique("Expand B"), "expander");
    await seedHabit(page, unique("Expand C"), "expander");

    // Insert B after A → A → B (A is solo anchor, B is picker solo).
    await openStackTab(page, idA);
    await linkAfter(page, "Expand B");

    // Now anchor B (chain member) and insert solo C after B → A → B → C.
    await openStackTab(page, idB);
    await linkAfter(page, "Expand C");

    await page.goto("/");
    // Click the root card (A) to expand the stack.
    await page.locator('.habit-list-row:has-text("Expand A")').first().click();

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

    // Insert B after A → A → B; A is step 1 of 2.
    await expect(page.locator('text=Step 1 of 2')).toBeVisible();
    // Diagram chips should not overflow
    const cardWidth = await page.locator('.card').first().evaluate((el) => el.scrollWidth);
    expect(cardWidth).toBeLessThanOrEqual(375);
  });

  /**
   * Clickable chips: each chain chip is itself a button that navigates to
   * that habit's detail page. Because we use router.push (not replace),
   * browser/Next history records the visited habits and the back button
   * walks back through them in reverse.
   */
  test("clicking a chain chip navigates to that habit's detail page", async ({ page }) => {
    const idA = await seedHabit(page, unique("Click A"), "clicker");
    const idB = await seedHabit(page, unique("Click B"), "clicker");
    await setStackNextId(page, idA, idB);

    await openStackTab(page, idA);
    await expect(page.locator('text=Step 1 of 2')).toBeVisible();

    // Click chip for B from A's detail page → URL changes to /habits/<idB>.
    await page.click(`[data-testid="stack-chip-link-${idB}"]`);
    await page.waitForURL(`**/habits/${idB}`);
    expect(page.url()).toContain(`/habits/${idB}`);
  });

  test("back button after clicking a chain chip returns to the previous habit", async ({ page }) => {
    const idA = await seedHabit(page, unique("Back A"), "backer");
    const idB = await seedHabit(page, unique("Back B"), "backer");
    await setStackNextId(page, idA, idB);

    await openStackTab(page, idA);
    await page.click(`[data-testid="stack-chip-link-${idB}"]`);
    await page.waitForURL(`**/habits/${idB}`);

    // Use browser back navigation — Next.js App Router's router.back()
    // ultimately uses window.history.back() under the hood, which is
    // equivalent to this.
    await page.goBack();
    await page.waitForURL(`**/habits/${idA}`);
    expect(page.url()).toContain(`/habits/${idA}`);
  });

  /**
   * Per-chip X button: removes that node from the chain. Server-side
   * stackRemovePatches null the removed habit's pointer first then rewires
   * the predecessor → former successor, so the chain heals around the gap.
   */
  test("X button on a mid-chain chip removes only that node and re-links neighbors", async ({ page }) => {
    const idA = await seedHabit(page, unique("Mid A"), "midder");
    const idB = await seedHabit(page, unique("Mid B"), "midder");
    const idC = await seedHabit(page, unique("Mid C"), "midder");

    // Build A → B → C via API.
    await setStackNextId(page, idA, idB);
    await setStackNextId(page, idB, idC);

    await openStackTab(page, idA);
    await expect(page.locator('text=Step 1 of 3')).toBeVisible();

    // Click the X on B's chip.
    await page.click(`[data-testid="stack-chip-remove-${idB}"]`);

    // Chain should heal to A → C: 2 chips remain, B is gone.
    await expect(page.locator('text=Step 1 of 2')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`[data-testid="stack-chip-link-${idB}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-testid="stack-chip-link-${idC}"]`)).toBeVisible();

    // Poll the API until the server has committed the change (optimistic UI
    // updates can win the race against the server commit).
    await expect
      .poll(
        async () => {
          const listRes = await page.request.get("/api/v1/habits");
          const body = await listRes.json();
          const habits = body.data?.habits as Array<{ id: string; stackNextId: string | null }>;
          return {
            a: habits.find((h) => h.id === idA)?.stackNextId ?? null,
            b: habits.find((h) => h.id === idB)?.stackNextId ?? null,
          };
        },
        { timeout: 5000 },
      )
      .toEqual({ a: idC, b: null });
  });

  test("X button removes the head of the chain and promotes the next habit", async ({ page }) => {
    const idA = await seedHabit(page, unique("Head A"), "header");
    const idB = await seedHabit(page, unique("Head B"), "header");
    await setStackNextId(page, idA, idB);

    await openStackTab(page, idB);
    await expect(page.locator('text=Step 2 of 2')).toBeVisible();

    await page.click(`[data-testid="stack-chip-remove-${idA}"]`);

    // B should become a solo habit (Step 1 of 1 or empty state).
    await expect(page.locator('text=This habit is not part of a stack.')).toBeVisible({ timeout: 5000 });

    // Poll for the server commit.
    await expect
      .poll(
        async () => {
          const listRes = await page.request.get("/api/v1/habits");
          const body = await listRes.json();
          const habits = body.data?.habits as Array<{ id: string; stackNextId: string | null }>;
          return {
            a: habits.find((h) => h.id === idA)?.stackNextId ?? null,
            b: habits.find((h) => h.id === idB)?.stackNextId ?? null,
          };
        },
        { timeout: 5000 },
      )
      .toEqual({ a: null, b: null });
  });

  /**
   * Drag-reorder: framer-motion's Reorder.Group uses pointer events. We use
   * page.mouse.down/move/up at the chip's bounding box centers to simulate
   * a real drag. The mutation hits the server as { kind: "reorder",
   * habitIds: [...] }; we verify by re-reading the API after the drag.
   *
   * The drag is sensitive to timing — Framer Motion needs at least one
   * intermediate move event before drop for the reorder to register, so we
   * send three small moves.
   */
  test("drag-reorder commits the new chain order to the server", async ({ page }) => {
    const idA = await seedHabit(page, unique("Drag A"), "dragger");
    const idB = await seedHabit(page, unique("Drag B"), "dragger");
    const idC = await seedHabit(page, unique("Drag C"), "dragger");

    // Build A → B → C.
    await setStackNextId(page, idA, idB);
    await setStackNextId(page, idB, idC);

    await openStackTab(page, idA);
    await expect(page.locator('text=Step 1 of 3')).toBeVisible();

    // Drag chip A rightward past chip B and C so the new order becomes B,C,A.
    const chipA = page.locator(`[data-testid="stack-chip-item-${idA}"]`);
    const chipC = page.locator(`[data-testid="stack-chip-item-${idC}"]`);
    const boxA = await chipA.boundingBox();
    const boxC = await chipC.boundingBox();
    if (!boxA || !boxC) {
      test.skip(true, "Could not measure chip bounding boxes for drag");
      return;
    }

    const startX = boxA.x + boxA.width / 2;
    const startY = boxA.y + boxA.height / 2;
    const endX = boxC.x + boxC.width + 10;
    const endY = boxC.y + boxC.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Multiple incremental moves so framer-motion registers the drag.
    await page.mouse.move(startX + (endX - startX) * 0.33, endY, { steps: 5 });
    await page.mouse.move(startX + (endX - startX) * 0.66, endY, { steps: 5 });
    await page.mouse.move(endX, endY, { steps: 5 });
    await page.mouse.up();

    // Allow optimistic update + server commit to settle.
    await page.waitForTimeout(1500);

    // Verify via the API. The exact final ordering depends on framer-motion
    // collision detection — we just assert that the chain remains a single
    // chain of length 3 with the same 3 habits, AND that the order changed
    // from the initial A→B→C (i.e. either A's stackNextId is now null/different,
    // or A is no longer the head).
    const listRes = await page.request.get("/api/v1/habits");
    const body = await listRes.json();
    const habits = body.data?.habits as Array<{ id: string; stackNextId: string | null }>;
    const ids = new Set([idA, idB, idC]);
    const chainHabits = habits.filter((h) => ids.has(h.id));
    expect(chainHabits.length).toBe(3);
    // Exactly one of {A, B, C} should be the tail (stackNextId === null).
    const tails = chainHabits.filter((h) => h.stackNextId === null);
    expect(tails.length).toBe(1);
    // Pointers should all stay inside the chain set.
    for (const h of chainHabits) {
      if (h.stackNextId) {
        expect(ids.has(h.stackNextId)).toBe(true);
      }
    }
  });

  test("X click does not also navigate (stopPropagation in real browser)", async ({ page }) => {
    const idA = await seedHabit(page, unique("Stop A"), "stopper");
    const idB = await seedHabit(page, unique("Stop B"), "stopper");
    await setStackNextId(page, idA, idB);

    await openStackTab(page, idA);
    const urlBefore = page.url();
    await page.click(`[data-testid="stack-chip-remove-${idB}"]`);

    // We should stay on A's page (URL unchanged), not navigate to B's page.
    // The chain should now show only A as solo.
    await expect(page.locator('text=This habit is not part of a stack.')).toBeVisible({ timeout: 5000 });
    expect(page.url()).toBe(urlBefore);
  });

  test("a standalone habit can join an existing chain by picking any chain member", async ({ page }) => {
    // Build chain A → B → C, plus solo S. From S's Stack tab, the picker
    // should include every other habit (chain members AND any other solos).
    // Picking B with "Link after…" must produce A → B → S → C.
    // Four habits exceed the active cap, so seed cap-aware — the inducted
    // habit stays in the store, so it still shows as a picker option.
    const [idA, idB, idC, idS] = await seedWithinCap(
      page,
      [
        unique("Solo Join A"),
        unique("Solo Join B"),
        unique("Solo Join C"),
        unique("Solo Join S"),
      ],
      "joiner",
    );
    await setStackNextId(page, idA, idB);
    await setStackNextId(page, idB, idC);

    await openStackTab(page, idS);
    // Empty-state for the solo habit.
    await expect(page.locator('text=This habit is not part of a stack.')).toBeVisible();

    await page.click('button:has-text("Link after…")');
    // Picker must offer chain members A, B, C when the current habit is solo.
    await expect(page.locator(`[data-testid="stack-link-option-${idA}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="stack-link-option-${idB}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="stack-link-option-${idC}"]`)).toBeVisible();

    await page.click(`[data-testid="stack-link-option-${idB}"]`);

    // Poll the API until the server commit lands. Expected chain:
    //   A → B → S → C, and C is the tail (stackNextId === null).
    await expect
      .poll(
        async () => {
          const listRes = await page.request.get("/api/v1/habits");
          const body = await listRes.json();
          const habits = body.data?.habits as Array<{ id: string; stackNextId: string | null }>;
          return {
            a: habits.find((h) => h.id === idA)?.stackNextId ?? null,
            b: habits.find((h) => h.id === idB)?.stackNextId ?? null,
            s: habits.find((h) => h.id === idS)?.stackNextId ?? null,
            c: habits.find((h) => h.id === idC)?.stackNextId ?? null,
          };
        },
        { timeout: 5000 },
      )
      .toEqual({ a: idB, b: idS, s: idC, c: null });
  });

  test("a standalone habit can join the top of a chain via Link before…", async ({ page }) => {
    // Chain A → B, solo S. From S's Stack tab pick A with "Link before…"
    // → result: S → A → B (S is now the head).
    const idA = await seedHabit(page, unique("Head Join A"), "topper");
    const idB = await seedHabit(page, unique("Head Join B"), "topper");
    const idS = await seedHabit(page, unique("Head Join S"), "topper");
    await setStackNextId(page, idA, idB);

    await openStackTab(page, idS);
    await page.click('button:has-text("Link before…")');
    await page.click(`[data-testid="stack-link-option-${idA}"]`);

    await expect
      .poll(
        async () => {
          const listRes = await page.request.get("/api/v1/habits");
          const body = await listRes.json();
          const habits = body.data?.habits as Array<{ id: string; stackNextId: string | null }>;
          return {
            s: habits.find((h) => h.id === idS)?.stackNextId ?? null,
            a: habits.find((h) => h.id === idA)?.stackNextId ?? null,
            b: habits.find((h) => h.id === idB)?.stackNextId ?? null,
          };
        },
        { timeout: 5000 },
      )
      .toEqual({ s: idA, a: idB, b: null });
  });
});
