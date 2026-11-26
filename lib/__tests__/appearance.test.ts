import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { accentColor, applyAppearance, readLegacyTheme } from "@/lib/appearance";

describe("Appearance theming", () => {
  // Given: a clean DOM and mocked localStorage before each test
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-variant");
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
    document.documentElement.removeAttribute("data-theme-variant");
    document.documentElement.style.cssText = "";
  });

  it("applies the light theme and accent hue", () => {
    // When: the user sets light theme with the sage hue (160)
    applyAppearance("light", 160);

    // Then: the HTML element gets the light theme data attribute
    expect(document.documentElement.dataset.theme).toBe("light");
    // And: the accent hue is exposed for every OKLCH accent token to derive from
    expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("160");
    // And: both settings are saved so the no-flash script can restore them
    expect(storage.get("atomicly:theme")).toBe("light");
    expect(storage.get("atomicly:accent")).toBe("160");
  });

  it("applies the dark theme", () => {
    // When: the user switches to dark mode with an ochre accent (60)
    applyAppearance("dark", 60);

    // Then: dark tokens take over and the hue is kept
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("60");
    expect(storage.get("atomicly:theme")).toBe("dark");
    expect(storage.get("atomicly:accent")).toBe("60");
  });

  it("persists the accent hue across theme switches and overwrites it on change", () => {
    // Given: the user has chosen a plum accent (340)
    applyAppearance("light", 340);
    applyAppearance("dark", 340);
    // Then: the hue survives the theme switch
    expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("340");

    // When: they pick slate (240)
    applyAppearance("dark", 240);
    // Then: the new hue replaces the old one
    expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("240");
    expect(storage.get("atomicly:accent")).toBe("240");
  });

  it("clears the retired theme-variant attribute and storage key", () => {
    // Given: leftovers from the retired Glass/Neon/Fairy/Stars system
    document.documentElement.setAttribute("data-theme-variant", "neon");
    storage.set("atomicly:theme-variant", "neon");

    // When: appearance is applied
    applyAppearance("dark", 160);

    // Then: no stale variant remains for CSS or the next reload to pick up
    expect(document.documentElement.hasAttribute("data-theme-variant")).toBe(false);
    expect(storage.has("atomicly:theme-variant")).toBe(false);
  });

  it("accentColor derives the primary colour from the hue", () => {
    // Then: the preview swatch matches the light-theme --primary token
    expect(accentColor(160)).toBe("oklch(0.48 0.09 160)");
  });

  describe("readLegacyTheme", () => {
    it("returns null when no retired variant is stored", () => {
      expect(readLegacyTheme()).toBeNull();
    });

    it("maps a stored retired variant to its supported theme", () => {
      // Given: a browser that remembered the Starlight theme
      storage.set("atomicly:theme-variant", "stars");
      // Then: it now resolves to Dark
      expect(readLegacyTheme()).toBe("dark");

      // Given: a browser that remembered the Glass theme
      storage.set("atomicly:theme-variant", "glass");
      // Then: it now resolves to Light
      expect(readLegacyTheme()).toBe("light");
    });

    it("ignores unknown stored values", () => {
      storage.set("atomicly:theme-variant", "rainbow");
      expect(readLegacyTheme()).toBeNull();
    });
  });
});