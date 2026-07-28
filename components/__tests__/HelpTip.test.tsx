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

      // Then: the bubble is nudged left so its right edge clears the 8px margin.
      // trigger centre = 359, half width = 130 -> right edge = 489;
      // 489 - (360 - 8) = 137px of overflow, so the shift is -137px.
      const tooltip = screen.getByRole("tooltip");
      expect(tooltip.style.getPropertyValue("--tip-shift")).toBe("-137px");
    } finally {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it("leaves the popover centred (no shift) when there is room on both sides", () => {
    // Given: a wide viewport with the trigger comfortably centred
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

    // Then: no correction is applied — the bubble stays centred over the trigger.
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.style.getPropertyValue("--tip-shift")).toBe("0px");
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

  it("flips the bubble below the trigger when the fixed mobile menu button blocks the space above", () => {
    // Given: a 360px-wide mobile viewport where the fixed hamburger button
    // occupies the top-left corner and the trigger sits just beneath it — the
    // exact situation where an upward bubble slid under the menu.
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 360 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 640 });
    const menuButton = document.createElement("button");
    menuButton.className = "mobile-menu-btn";
    document.body.appendChild(menuButton);

    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      if (this.classList.contains("mobile-menu-btn")) {
        // Fixed hamburger: 40px square anchored 12px from the top.
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
});
