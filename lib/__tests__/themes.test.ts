import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME_ID,
  THEMES,
  getTheme,
  isThemeVariantId,
  type ThemeVariantId,
} from "@/lib/themes";

describe("themes registry", () => {
  describe("THEMES list", () => {
    it("exposes the six designed themes with unique ids", () => {
      // Given: the registry of selectable themes
      const ids = THEMES.map((theme) => theme.id);

      // Then: it contains every designed variant exactly once
      expect(ids).toEqual(["light", "dark", "glass", "neon", "fairy", "stars"]);
      // And: there are no duplicate ids (Set size matches array length)
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("gives every theme a label, description, valid base, and swatch", () => {
      // Then: each theme is fully described so the Settings gallery can render it
      for (const theme of THEMES) {
        expect(theme.label.length).toBeGreaterThan(0);
        expect(theme.description.length).toBeGreaterThan(0);
        expect(["light", "dark"]).toContain(theme.base);
        expect(["ripple", "sparkle", "bubble", "none"]).toContain(theme.clickEffect);
        expect(theme.swatch.from).toMatch(/^#/);
        expect(theme.swatch.to).toMatch(/^#/);
      }
    });

    it("keeps the plain light/dark themes on their matching base mode", () => {
      // Then: selecting "Bright"/"Midnight" must not flip the underlying mode
      expect(getTheme("light").base).toBe("light");
      expect(getTheme("dark").base).toBe("dark");
    });
  });

  describe("isThemeVariantId", () => {
    it("accepts known ids and rejects everything else", () => {
      // Then: only real registry ids pass the guard
      expect(isThemeVariantId("neon")).toBe(true);
      expect(isThemeVariantId("stars")).toBe(true);
      // And: stale, unknown, or empty values are rejected
      expect(isThemeVariantId("sparkling-stars")).toBe(false);
      expect(isThemeVariantId("rainbow")).toBe(false);
      expect(isThemeVariantId(null)).toBe(false);
      expect(isThemeVariantId(undefined)).toBe(false);
    });
  });

  describe("getTheme", () => {
    it("returns the requested theme when the id is valid", () => {
      // When: a valid id is resolved
      const theme = getTheme("glass");

      // Then: the matching option comes back
      expect(theme.id).toBe<ThemeVariantId>("glass");
      expect(theme.base).toBe("light");
      expect(theme.clickEffect).toBe("bubble");
    });

    it("falls back to the default theme for unknown or missing ids", () => {
      // Then: bad input never throws and yields the default look instead
      expect(getTheme("does-not-exist").id).toBe(DEFAULT_THEME_ID);
      expect(getTheme(null).id).toBe(DEFAULT_THEME_ID);
      expect(getTheme(undefined).id).toBe(DEFAULT_THEME_ID);
    });
  });
});
