import { test, expect, type Page } from "@playwright/test";

/**
 * help-tip-overflow.spec — end-to-end regression proof that the contextual "?"
 * help bubble (`components/HelpTip.tsx`) always lands somewhere the user can
 * actually read it.
 *
 * WHY ONLY AN E2E TEST CAN PROVE THIS:
 * The bug was purely a rendered-geometry problem. The bubble opens *above* its
 * trigger by default, but on a phone the `/habits/new` heading sits right below
 * the fixed hamburger menu button, so an upward bubble slid underneath that
 * button and off the top of the screen. jsdom reports every element as a
 * zero-sized box at (0,0), so a unit test can only check the maths we feed it —
 * it cannot prove the real browser paints the bubble in a readable place. This
 * spec measures real `getBoundingClientRect()` boxes in a real layout and
 * asserts the three user-visible invariants:
 *   1. the whole bubble is inside the viewport,
 *   2. it never overlaps the fixed mobile menu button,
 *   3. the bubble is the top-most element at its own centre (nothing covers it).
 *
 * It runs under both Playwright projects, so the desktop project proves we did
 * not regress the normal "open above the trigger" placement while the Mobile
 * Chrome project proves the flip-below fix.
 *
 * PREREQUISITES: a running DB-backed app (see `playwright.config.ts` webServer)
 * and the shared signed-in storage state from `e2e/auth.setup.ts`.
 */

/** Geometry snapshot of the open help bubble, measured in the real browser. */
type TipGeometry = {
  /** "top" = above the trigger (default), "bottom" = flipped below it. */
  placement: string | null;
  /** True when every edge of the bubble is inside the viewport. */
  withinViewport: boolean;
  /** True when the bubble's box intersects the fixed mobile menu button. */
  overlapsMenuButton: boolean;
  /** True when the bubble itself is painted on top at its own centre point. */
  unobstructed: boolean;
  /** True when the bubble sits entirely above its trigger. */
  aboveTrigger: boolean;
  /** True when the bubble sits entirely below its trigger. */
  belowTrigger: boolean;
  /** True when the fixed hamburger menu button is rendered (mobile layout). */
  mobileMenuVisible: boolean;
  /**
   * True when the bubble genuinely fits in the gap between the trigger and the
   * highest usable point on screen (the viewport top, or the bottom of the
   * fixed mobile menu button when that is in the way). Measured independently
   * of the component's own decision so we can assert the rule it must follow.
   */
  hasRoomAbove: boolean;
};

/**
 * Open the help tip with the given accessible name and measure where it landed.
 * All measuring happens inside the page so we read the browser's own layout
 * rather than Playwright's cached boxes.
 */
async function openAndMeasureTip(page: Page, label: string): Promise<TipGeometry> {
  await page.getByRole("button", { name: label }).click();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();

  return page.evaluate((tipLabel) => {
    const trigger = document.querySelector<HTMLElement>(`button[aria-label="${tipLabel}"]`);
    const tip = document.querySelector<HTMLElement>('[role="tooltip"]');
    if (!trigger || !tip) {
      throw new Error("Help tip trigger or bubble was not found in the DOM.");
    }

    const tipRect = tip.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();

    // The hamburger button is `display: none` on desktop, so an empty box means
    // "no mobile chrome in the way".
    const menuButton = document.querySelector<HTMLElement>(".mobile-menu-btn");
    const menuRect = menuButton?.getBoundingClientRect() ?? null;
    const mobileMenuVisible = !!menuRect && menuRect.width > 0 && menuRect.height > 0;
    const overlapsMenuButton =
      mobileMenuVisible && menuRect
        ? !(
            tipRect.right <= menuRect.left ||
            tipRect.left >= menuRect.right ||
            tipRect.bottom <= menuRect.top ||
            tipRect.top >= menuRect.bottom
          )
        : false;

    // Whatever the browser paints at the bubble's centre must be the bubble (or
    // its own text), otherwise something is covering it.
    const atCentre = document.elementFromPoint(
      tipRect.left + tipRect.width / 2,
      tipRect.top + tipRect.height / 2,
    );

    return {
      placement: tip.getAttribute("data-placement"),
      // Allow a sub-pixel tolerance for fractional layout rounding.
      withinViewport:
        tipRect.left >= -1 &&
        tipRect.top >= -1 &&
        tipRect.right <= window.innerWidth + 1 &&
        tipRect.bottom <= window.innerHeight + 1,
      overlapsMenuButton,
      unobstructed: !!atCentre && (atCentre === tip || tip.contains(atCentre)),
      aboveTrigger: tipRect.bottom <= triggerRect.top + 1,
      belowTrigger: tipRect.top >= triggerRect.bottom - 1,
      mobileMenuVisible,
      // The 8px gap mirrors the component's own safety margin.
      hasRoomAbove:
        triggerRect.top - Math.max(8, (menuRect && mobileMenuVisible ? menuRect.bottom : 0) + 8) >=
        tipRect.height + 8,
    };
  }, label);
}

test.describe("HelpTip stays readable inside the viewport", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/habits/new");
    // The heading (and its help tip) is the anchor for every assertion below.
    await expect(page.getByRole("button", { name: "How many habits can I have?" })).toBeVisible();
  });

  test("keeps the heading help bubble on screen and clear of the mobile menu button", async ({
    page,
  }) => {
    // Given: the Create Habit page, whose heading tip sits near the top of the
    // screen — directly under the fixed hamburger button on a phone.
    // When: the user taps the "?" beside the heading
    const geometry = await openAndMeasureTip(page, "How many habits can I have?");

    // Then: the entire explanation is visible, nothing covers it, and it never
    // hides behind the navigation button.
    expect(geometry.withinViewport).toBe(true);
    expect(geometry.overlapsMenuButton).toBe(false);
    expect(geometry.unobstructed).toBe(true);
  });

  test("only flips the bubble below the trigger when it cannot fit above", async ({ page }) => {
    // Given/When: the heading help tip is opened in whichever layout this
    // project renders (mobile drawer nav vs. desktop sidebar).
    const geometry = await openAndMeasureTip(page, "How many habits can I have?");

    if (geometry.hasRoomAbove) {
      // Then: nothing changes — the bubble keeps its default placement above
      // the trigger, exactly as it did before this fix.
      expect(geometry.placement).toBe("top");
      expect(geometry.aboveTrigger).toBe(true);
    } else {
      // Then: with no clear space above (the phone case, where the fixed menu
      // button and the screen edge eat the room), the bubble hangs below the
      // trigger instead of sliding underneath the menu.
      expect(geometry.placement).toBe("bottom");
      expect(geometry.belowTrigger).toBe(true);
    }
  });

  test("flips the heading bubble below the trigger in the mobile layout", async ({ page }) => {
    // Given: the mobile layout, where the fixed hamburger button sits directly
    // above the Create Habit heading. (Skipped on the desktop project, which
    // has no hamburger button.)
    const geometry = await openAndMeasureTip(page, "How many habits can I have?");
    test.skip(!geometry.mobileMenuVisible, "Desktop layout has no fixed mobile menu button.");

    // Then: this is the exact regression case — the bubble must hang below.
    expect(geometry.placement).toBe("bottom");
    expect(geometry.belowTrigger).toBe(true);
    expect(geometry.overlapsMenuButton).toBe(false);
  });

  test("keeps the bubble on screen after the viewport is resized while open", async ({ page }) => {
    // Given: an open help bubble
    await page.getByRole("button", { name: "How many habits can I have?" }).click();
    await expect(page.getByRole("tooltip")).toBeVisible();

    // When: the device is rotated / the window shrinks to a very narrow phone
    await page.setViewportSize({ width: 320, height: 568 });
    // Let the resize listener re-measure and React re-render before asserting.
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const tip = document.querySelector<HTMLElement>('[role="tooltip"]');
          if (!tip) return false;
          const rect = tip.getBoundingClientRect();
          return (
            rect.left >= -1 &&
            rect.top >= -1 &&
            rect.right <= window.innerWidth + 1 &&
            rect.bottom <= window.innerHeight + 1
          );
        }),
      )
      // Then: the bubble re-positions itself back inside the smaller viewport.
      .toBe(true);
  });

  /**
   * The medium-window regression: at tablet-ish sizes the page scrolls under
   * the fixed hamburger button, so the trigger itself can slip behind it. The
   * bubble is anchored to the trigger, so flipping it below is NOT enough — it
   * has to be pushed back down past the menu. This sweep opens both tips on the
   * page at several window sizes and scroll offsets and demands the bubble stay
   * readable in every combination.
   */
  test("stays readable at every window size and scroll offset", async ({ page }) => {
    const viewports = [
      { width: 480, height: 700 },
      { width: 600, height: 620 },
      { width: 768, height: 560 },
      { width: 860, height: 600 },
      { width: 1024, height: 500 },
    ];
    const scrollOffsets = [0, 60, 150, 300];
    const failures: unknown[] = [];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      const batch = await page.evaluate(
        async ({ offsets }) => {
          const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
          const bad: unknown[] = [];

          // Every help trigger currently rendered on the page.
          const labels = Array.from(document.querySelectorAll<HTMLElement>("button[aria-label]"))
            .filter((button) => button.textContent?.trim() === "?")
            .map((button) => button.getAttribute("aria-label")!);

          for (const label of labels) {
            for (const offset of offsets) {
              // Close any open tip, scroll, then reopen so it measures fresh.
              document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
              await sleep(40);
              window.scrollTo(0, offset);
              await sleep(110);
              const trigger = document.querySelector<HTMLElement>(
                `button[aria-label="${label}"]`,
              );
              if (!trigger) continue;
              trigger.click();
              await sleep(160);

              const tip = document.querySelector<HTMLElement>('[role="tooltip"]');
              if (!tip) continue;
              const rect = tip.getBoundingClientRect();
              const menu = document.querySelector<HTMLElement>(".mobile-menu-btn");
              const menuRect =
                menu && getComputedStyle(menu).display !== "none"
                  ? menu.getBoundingClientRect()
                  : null;
              const overlapsMenu = menuRect
                ? !(
                    rect.right <= menuRect.left ||
                    rect.left >= menuRect.right ||
                    rect.bottom <= menuRect.top ||
                    rect.top >= menuRect.bottom
                  )
                : false;
              const atCentre = document.elementFromPoint(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
              );
              const withinViewport =
                rect.left >= -1 &&
                rect.top >= -1 &&
                rect.right <= window.innerWidth + 1 &&
                rect.bottom <= window.innerHeight + 1;
              const unobstructed = !!atCentre && (atCentre === tip || tip.contains(atCentre));

              if (!withinViewport || overlapsMenu || !unobstructed) {
                bad.push({
                  viewport: `${window.innerWidth}x${window.innerHeight}`,
                  label,
                  scrollY: offset,
                  withinViewport,
                  overlapsMenu,
                  unobstructed,
                  placement: tip.getAttribute("data-placement"),
                  box: [rect.top, rect.left, rect.right, rect.bottom].map((n) => Math.round(n)),
                });
              }
            }
          }

          document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
          window.scrollTo(0, 0);
          return bad;
        },
        { offsets: scrollOffsets },
      );
      failures.push(...batch);
    }

    // Then: not a single combination leaves the bubble clipped, covered, or
    // hidden behind the fixed navigation button.
    expect(failures).toEqual([]);
  });
});
