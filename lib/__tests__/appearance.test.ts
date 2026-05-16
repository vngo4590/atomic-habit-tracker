import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyAppearance } from "@/lib/appearance";

describe("Appearance theming", () => {
  // Given: a clean DOM and mocked localStorage before each test
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.cssText = "";

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
        removeItem: vi.fn((key: string) => storage.delete(key)),
        clear: vi.fn(() => storage.clear()),
      },
    });
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.cssText = "";
  });

  it("applies light theme with ochre accent by default", () => {
    // When: the user sets light theme with the default ochre hue (60)
    applyAppearance("light", 60);

    // Then: the HTML element gets the light theme data attribute
    expect(document.documentElement.dataset.theme).toBe("light");
    // And: the accent color is set to a warm ochre tone
    expect(document.documentElement.style.getPropertyValue("--accent")).toContain("oklch(62% 0.13 60)");
    // And: the softer accent is light-friendly
    expect(document.documentElement.style.getPropertyValue("--accent-soft")).toContain("92%");
    // And: both settings are saved to localStorage so they persist across reloads
    expect(storage.get("atomicly:theme")).toBe("light");
    expect(storage.get("atomicly:accent")).toBe("60");
  });

  it("applies dark theme with sage accent", () => {
    // When: the user switches to dark mode with a sage green accent (145)
    applyAppearance("dark", 145);

    // Then: the HTML element gets the dark theme data attribute
    expect(document.documentElement.dataset.theme).toBe("dark");
    // And: the accent uses the sage hue
    expect(document.documentElement.style.getPropertyValue("--accent")).toContain("oklch(62% 0.13 145)");
    // And: the softer accent is dark-friendly (darker, less saturated)
    expect(document.documentElement.style.getPropertyValue("--accent-soft")).toContain("28%");
    // And: settings are persisted
    expect(storage.get("atomicly:theme")).toBe("dark");
    expect(storage.get("atomicly:accent")).toBe("145");
  });

  it("persists accent hue across theme switches", () => {
    // Given: the user has chosen a plum accent (340)
    // When: they switch from light to dark while keeping the same accent
    applyAppearance("light", 340);
    applyAppearance("dark", 340);

    // Then: the accent hue remains 340 in both theme modes
    expect(document.documentElement.style.getPropertyValue("--accent")).toContain("340");
    // And: localStorage always reflects the latest choice
    expect(storage.get("atomicly:accent")).toBe("340");
  });

  it("overwrites previous accent when changed", () => {
    // Given: the user previously had an ochre accent
    applyAppearance("light", 60);
    // When: they change to a slate blue accent (240)
    applyAppearance("light", 240);

    // Then: the new accent replaces the old one in CSS
    expect(document.documentElement.style.getPropertyValue("--accent")).toContain("240");
    expect(document.documentElement.style.getPropertyValue("--accent")).not.toContain("60");
  });
});
