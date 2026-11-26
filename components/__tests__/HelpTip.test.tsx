import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HelpTip } from "@/components/HelpTip";

afterEach(() => {
  cleanup();
  // Restore any getBoundingClientRect spies so layout stubs don't leak between tests.
  vi.restoreAllMocks();
});

/** Build a DOMRect for jsdom (which otherwise reports all zeros) so we can
 *  simulate a trigger sitting near a screen edge and a fixed-width popover. */
function makeRect(overrides: Partial<DOMRect>): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
    ...overrides,
  } as DOMRect;
}

describe("HelpTip", () => {
  it("hides the explanatory text until the trigger is activated", () => {
    // Given: a rendered HelpTip
    render(<HelpTip>You can have at most 3 active habits.</HelpTip>);

    // Then: the trigger is present but the help text is not yet shown
    expect(screen.getByRole("button", { name: "Help" })).toBeTruthy();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("reveals the caller-supplied text when the trigger is clicked", () => {
    // Given: a HelpTip with explanatory content
    render(<HelpTip>Inducting a habit frees a slot.</HelpTip>);

    // When: the user activates the trigger
    fireEvent.click(screen.getByRole("button", { name: "Help" }));

    // Then: the popover text becomes visible
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toContain("Inducting a habit frees a slot.");
  });

  it("uses a custom accessible label when provided", () => {
    // Given: a HelpTip with an overridden label
    render(<HelpTip label="Why is this disabled?">Because you are at the cap.</HelpTip>);

    // Then: the trigger exposes that accessible name
    expect(screen.getByRole("button", { name: "Why is this disabled?" })).toBeTruthy();
  });

  it("declares the trigger as type=button so it never submits a surrounding form", () => {
    // Given: a HelpTip nested inside a form with a submit spy
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <HelpTip>Help text</HelpTip>
      </form>,
    );

    // When: the trigger is clicked
    const trigger = screen.getByRole("button", { name: "Help" });
    expect(trigger.getAttribute("type")).toBe("button");
    fireEvent.click(trigger);

    // Then: the form is not submitted
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("reflects its open state via aria-expanded", () => {
    // Given: a rendered HelpTip
    render(<HelpTip>Help text</HelpTip>);
    const trigger = screen.getByRole("button", { name: "Help" });

    // Then: it starts collapsed
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    // When: opened
    fireEvent.click(trigger);

    // Then: aria-expanded flips to true and associates the popover
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("closes the popover when Escape is pressed", () => {
    // Given: an open HelpTip
    render(<HelpTip>Help text</HelpTip>);
    const trigger = screen.getByRole("button", { name: "Help" });
    fireEvent.click(trigger);
    expect(screen.getByRole("tooltip")).toBeTruthy();

    // When: the user presses Escape
    fireEvent.keyDown(document, { key: "Escape" });

    // Then: the popover closes
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes the popover when the user interacts outside the control", () => {
    // Given: an open HelpTip
    render(<HelpTip>Help text</HelpTip>);
    const trigger = screen.getByRole("button", { name: "Help" });
    fireEvent.click(trigger);
    expect(screen.getByRole("tooltip")).toBeTruthy();

    // When: a pointer interaction happens outside the control
    fireEvent.pointerDown(document.body);

    // Then: the popover closes and the trigger returns to its collapsed state
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("shifts the popover back inside the viewport when the trigger is near a screen edge", () => {
    // Given: a narrow 360px viewport with the trigger pinned near the right edge,
    // and a bubble whose natural width (260px) would overflow that edge.
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 360 });
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      if (this.getAttribute("role") === "tooltip") {
        return makeRect({ left: 0, right: 260, width: 260 });
      }
      // The trigger/wrapper sits 350px from the left of a 360px-wide screen.
      return makeRect({ left: 350, right: 368, width: 18 });
    });

    try {
      render(<HelpTip>Explanation that would otherwise overflow the screen.</HelpTip>);

      // When: the user opens the tip
      fireEvent.click(screen.getByRole("button", { name: "Help" }));

      // Then: the bubble is pulled left so its right edge clears the 8px margin.
      // Left-aligned natural position = 350; right edge = 350 + 260 = 610;
      // allowed right edge = 360 - 8 = 352, so the shift is 352 - 610 = -258px.
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip.style.getPropertyValue("--tip-shift")).toBe("-258px");
    } finally {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it("leaves the popover flush with the trigger's left edge when there is room to its right", () => {
    // Given: a wide viewport with plenty of space to the right of the trigger
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      if (this.getAttribute("role") === "tooltip") {
        return makeRect({ left: 470, right: 730, width: 260 });
      }
      return makeRect({ left: 591, right: 609, width: 18 });
    });

    render(<HelpTip>Plenty of room here.</HelpTip>);

    // When: the tip opens
    fireEvent.click(screen.getByRole("button", { name: "Help" }));

    // Then: no correction is applied — the bubble's left edge stays lined up
    // with the "?" and the text grows rightwards, away from page chrome.
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.style.getPropertyValue("--tip-shift")).toBe("0px");
  });

  it("never pulls the bubble off the left edge, even on a viewport narrower than the bubble", () => {
    // Given: an extremely narrow 200px viewport and a 260px bubble — there is
    // no position where both side margins can be honoured.
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 200 });
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      if (this.getAttribute("role") === "tooltip") {
        return makeRect({ left: 0, right: 260, width: 260 });
      }
      return makeRect({ left: 150, right: 168, width: 18 });
    });

    try {
      render(<HelpTip>Very cramped screen.</HelpTip>);

      // When: the user opens the tip
      fireEvent.click(screen.getByRole("button", { name: "Help" }));

      // Then: keeping the left edge readable wins over the right-edge clamp,
      // so the bubble starts at the 8px margin (shift = 8 - 150 = -142px)
      // rather than sliding its opening words off the screen.
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip.style.getPropertyValue("--tip-shift")).toBe("-142px");
    } finally {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it("keeps the bubble above the trigger when there is clear room above it", () => {
    // Given: a trigger sitting low on the page with plenty of empty space above
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      if (this.getAttribute("role") === "tooltip") {
        return makeRect({ left: 470, right: 730, width: 260, top: 300, bottom: 380, height: 80 });
      }
      return makeRect({ left: 591, right: 609, width: 18, top: 400, bottom: 418, height: 18 });
    });

    render(<HelpTip>Plenty of headroom.</HelpTip>);

    // When: the tip opens
    fireEvent.click(screen.getByRole("button", { name: "Help" }));

    // Then: it uses the default placement above the trigger
    expect(screen.getByRole("tooltip").getAttribute("data-placement")).toBe("top");
  });

  it("flips the bubble below the trigger when the fixed mobile top bar blocks the space above", () => {
    // Given: a 360px-wide mobile viewport where a fixed top obstruction
    // occupies the top-left corner and the trigger sits just beneath it — the
    // exact situation where an upward bubble slid under the menu.
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 360 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 640 });
    const menuButton = document.createElement("button");
    menuButton.setAttribute("data-top-obstruction", "");
    document.body.appendChild(menuButton);

    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      if (this.hasAttribute("data-top-obstruction")) {
        // Fixed top chrome: a 40px box anchored 12px from the top.
        return makeRect({ left: 12, right: 52, width: 40, top: 12, bottom: 52, height: 40 });
      }
      if (this.getAttribute("role") === "tooltip") {
        return makeRect({ left: 50, right: 310, width: 260, top: 0, bottom: 80, height: 80 });
      }
      // The trigger sits in the page heading, only 70px down the screen.
      return makeRect({ left: 171, right: 189, width: 18, top: 70, bottom: 88, height: 18 });
    });

    try {
      render(<HelpTip>Explanation that has nowhere to go above the trigger.</HelpTip>);

      // When: the user opens the tip
      fireEvent.click(screen.getByRole("button", { name: "Help" }));

      // Then: the bubble flips below the trigger so the menu never covers it
      expect(screen.getByRole("tooltip").getAttribute("data-placement")).toBe("bottom");
    } finally {
      menuButton.remove();
    }
  });

  it("pushes the bubble down past the fixed top bar when the trigger is scrolled behind it", () => {
    // Given: a mid-size window where the user has scrolled far enough that the
    // trigger itself has slipped up behind the fixed top chrome. Flipping
    // alone cannot help here — the bubble is anchored to the trigger, so it
    // would still be dragged underneath the menu.
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 860 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 600 });
    const menuButton = document.createElement("button");
    menuButton.setAttribute("data-top-obstruction", "");
    document.body.appendChild(menuButton);

    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      if (this.hasAttribute("data-top-obstruction")) {
        return makeRect({ left: 12, right: 52, width: 40, top: 12, bottom: 52, height: 40 });
      }
      if (this.getAttribute("role") === "tooltip") {
        return makeRect({ left: 300, right: 560, width: 260, top: 0, bottom: 112, height: 112 });
      }
      // Trigger scrolled 20px ABOVE the top of the screen.
      return makeRect({ left: 421, right: 439, width: 18, top: -20, bottom: -2, height: 18 });
    });

    try {
      render(<HelpTip>Explanation the user must still be able to read.</HelpTip>);

      // When: the user opens the tip
      fireEvent.click(screen.getByRole("button", { name: "Help" }));

      // Then: the bubble is pushed down so its top clears the top chrome's
      // bottom edge (52px) plus the 8px safety margin. Its natural top would be
      // trigger bottom (-2) + 8px gap = 6px, so the lift is 60 - 6 = 54px.
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip.getAttribute("data-placement")).toBe("bottom");
      expect(tooltip.style.getPropertyValue("--tip-lift")).toBe("54px");
    } finally {
      menuButton.remove();
    }
  });

  it("pulls the bubble up when it would otherwise run off the bottom of a short window", () => {
    // Given: a short window with the trigger near the bottom, where a bubble
    // hanging below would spill off-screen.
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 300 });
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      if (this.getAttribute("role") === "tooltip") {
        return makeRect({ left: 400, right: 660, width: 260, top: 0, bottom: 200, height: 200 });
      }
      // Trigger sits 120px down a 300px-tall window: 112px above, 172px below —
      // the 200px bubble fits on neither side, so the roomier side wins.
      return makeRect({ left: 503, right: 521, width: 18, top: 120, bottom: 138, height: 18 });
    });

    render(<HelpTip>A long explanation in a very short window.</HelpTip>);

    // When: the user opens the tip
    fireEvent.click(screen.getByRole("button", { name: "Help" }));

    // Then: it takes the roomier side (below) and is pulled up so its bottom
    // clears the 8px margin. Natural top = 138 + 8 = 146; bottom would be 346,
    // but the floor is 300 - 8 = 292, so the lift is 292 - 346 = -54px.
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.getAttribute("data-placement")).toBe("bottom");
    expect(tooltip.style.getPropertyValue("--tip-lift")).toBe("-54px");
  });

  it("keeps the bubble clear of the fixed mobile bottom tab bar", () => {
    // Given: a short phone viewport with a 64px bottom tab bar, where the
    // bubble has to open below the trigger and would reach under the bar.
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 400 });
    const tabBar = document.createElement("nav");
    tabBar.setAttribute("data-bottom-obstruction", "");
    document.body.appendChild(tabBar);

    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      if (this.hasAttribute("data-bottom-obstruction")) {
        return makeRect({ left: 0, right: 390, width: 390, top: 336, bottom: 400, height: 64 });
      }
      if (this.getAttribute("role") === "tooltip") {
        return makeRect({ left: 20, right: 280, width: 260, top: 0, bottom: 210, height: 210 });
      }
      // Trigger 100px down: only 84px of room above, 202px below (to the bar).
      return makeRect({ left: 20, right: 38, width: 18, top: 100, bottom: 118, height: 18 });
    });

    try {
      render(<HelpTip>Explanation near the bottom of a phone screen.</HelpTip>);

      // When: the user opens the tip
      fireEvent.click(screen.getByRole("button", { name: "Help" }));

      // Then: it opens below and is pulled up so its bottom clears the bar
      // top (336) minus the 8px margin. Natural top = 118 + 8 = 126; bottom
      // would be 336, the floor is 328, so the lift is -8px.
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip.getAttribute("data-placement")).toBe("bottom");
      expect(tooltip.style.getPropertyValue("--tip-lift")).toBe("-8px");
    } finally {
      tabBar.remove();
    }
  });
  it("applies no vertical correction when the bubble already fits above the trigger", () => {
    // Given: a roomy desktop window with the trigger low on the page
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      if (this.getAttribute("role") === "tooltip") {
        return makeRect({ left: 510, right: 770, width: 260, top: 300, bottom: 412, height: 112 });
      }
      return makeRect({ left: 631, right: 649, width: 18, top: 450, bottom: 468, height: 18 });
    });

    render(<HelpTip>Nothing to correct here.</HelpTip>);

    // When: the tip opens
    fireEvent.click(screen.getByRole("button", { name: "Help" }));

    // Then: the original placement and geometry are untouched.
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.getAttribute("data-placement")).toBe("top");
    expect(tooltip.style.getPropertyValue("--tip-lift")).toBe("0px");
    expect(tooltip.style.getPropertyValue("--tip-shift")).toBe("0px");
  });
});
