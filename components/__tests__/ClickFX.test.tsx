import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClickFX } from "@/components/ClickFX";

// framer-motion's useReducedMotion reads window.matchMedia, which jsdom lacks.
// Stub it per-test so we can drive the reduced-motion branch deterministically.
function stubMatchMedia(prefersReduced: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: prefersReduced,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Dispatch a primary pointerdown that survives jsdom's partial PointerEvent
// support (button/isPrimary aren't always honoured by the constructor).
function firePrimaryPointerDown(x: number, y: number) {
  const Ctor = (window as unknown as { PointerEvent?: typeof MouseEvent }).PointerEvent ?? MouseEvent;
  const event = new Ctor("pointerdown", { button: 0, clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(event, "isPrimary", { value: true, configurable: true });
  act(() => {
    window.dispatchEvent(event);
  });
}

describe("ClickFX", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme-variant");
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme-variant");
  });

  it("renders a non-interactive, screen-reader-hidden overlay layer", () => {
    // Given: motion is allowed
    stubMatchMedia(false);

    // When: the effect layer mounts
    const { container } = render(<ClickFX />);

    // Then: a click-through overlay exists but holds no particles at rest
    const layer = container.querySelector("[aria-hidden='true']");
    expect(layer).not.toBeNull();
    expect(layer?.querySelector("span")).toBeNull();
  });

  it("spawns particles on a primary click for an effect-bearing theme", () => {
    // Given: motion is allowed and the Neon (sparkle) theme is active
    stubMatchMedia(false);
    document.documentElement.dataset.themeVariant = "neon";
    const { container } = render(<ClickFX />);

    // When: the user presses the primary pointer button
    firePrimaryPointerDown(40, 50);

    // Then: at least one particle is rendered into the overlay
    expect(container.querySelectorAll("[aria-hidden='true'] span").length).toBeGreaterThan(0);
  });

  it("does not spawn particles when the user prefers reduced motion", () => {
    // Given: reduced motion is requested and a sparkle theme is active
    stubMatchMedia(true);
    document.documentElement.dataset.themeVariant = "neon";
    const { container } = render(<ClickFX />);

    // When: the user clicks
    firePrimaryPointerDown(40, 50);

    // Then: no particles appear — motion is suppressed
    expect(container.querySelectorAll("[aria-hidden='true'] span").length).toBe(0);
  });
});
