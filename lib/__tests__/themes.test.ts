import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME_ID,
  LEGACY_THEME_MAP,
  THEMES,
  isThemeId,
  resolveThemeId,
} from "@/lib/themes";

describe("themes registry", () => {
  describe("THEMES list", () => {
    it("offers exactly Light and Dark (ADR-0003)", () => {
      // Given: the registry of selectable themes
      const ids = THEMES.map((theme) => theme.id);

      // Then: only the two supported looks are selectable, in display order
      expect(ids).toEqual(["light", "dark"]);
      // And: each has a human label for the Settings picker
      expect(THEMES.map((theme) => theme.label)).toEqual(["Light", "Dark"]);
    });

    it("defaults to the light theme", () => {
      // Then: with nothing stored, the app renders in Light
      expect(DEFAULT_THEME_ID).toBe("light");
    });
  });

  describe("isThemeId", () => {
    it("accepts only the supported ids", () => {
      // Then: the two real themes pass the guard
      expect(isThemeId("light")).toBe(true);
      expect(isThemeId("dark")).toBe(true);
      // And: retired, unknown and empty values are rejected
      expect(isThemeId("neon")).toBe(false);
      expect(isThemeId("rainbow")).toBe(false);
      expect(isThemeId(null)).toBe(false);
      expect(isThemeId(undefined)).toBe(false);
    });
  });

  describe("resolveThemeId (legacy mapping)", () => {
    it("passes current theme ids through unchanged", () => {
      // When/Then: users already on Light or Dark keep their choice
      expect(resolveThemeId("light")).toBe("light");
      expect(resolveThemeId("dark")).toBe("dark");
    });

    it("maps the retired airy themes Glass and Fairy to Light", () => {
      // Given: a user who had picked a bright decorative look
      // Then: they land on Light rather than losing their choice
      expect(resolveThemeId("glass")).toBe("light");
      expect(resolveThemeId("fairy")).toBe("light");
    });

    it("maps the retired night themes Neon and Starlight to Dark", () => {
      // Given: a user who had picked a night-time decorative look
      // Then: they land on Dark
      expect(resolveThemeId("neon")).toBe("dark");
      expect(resolveThemeId("stars")).toBe("dark");
    });

    it("covers every retired id exactly once", () => {
      // Then: the mapping table lists the four retired themes and nothing else
      expect(Object.keys(LEGACY_THEME_MAP).sort()).toEqual(["fairy", "glass", "neon", "stars"]);
    });

    it("returns null for unknown or missing values so callers can fall back", () => {
      // Then: garbage never throws and never picks a theme on its own
      expect(resolveThemeId("sparkling-stars")).toBeNull();
      expect(resolveThemeId("constructor")).toBeNull();
      expect(resolveThemeId("")).toBeNull();
      expect(resolveThemeId(null)).toBeNull();
      expect(resolveThemeId(undefined)).toBeNull();
    });
  });
});
