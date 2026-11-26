/**
 * themes.ts — the registry of selectable themes and the legacy-theme mapping.
 *
 * What this is, in plain language:
 *   Atomicly has exactly two looks: Light and Dark (ADR-0003). Earlier
 *   versions also offered decorative "theme variants" (Glass, Neon, Fairy,
 *   Starlight) that were remembered only in the browser's localStorage. Those
 *   looks were retired, but people who picked one still have the old id
 *   saved. Instead of silently dropping their choice we map each retired id to
 *   the nearest supported theme: the airy light looks become Light and the
 *   night-time looks become Dark. No database migration is needed because the
 *   server only ever stored the base light/dark value.
 *
 * Everything that reads a stored theme value (the no-flash script in
 * app/layout.tsx, lib/appearance.ts, the Settings picker) goes through
 * `resolveThemeId` so the mapping lives in exactly one place.
 */

import type { Theme } from "@/lib/types";

/** A supported theme id — the same value stored in user preferences. */
export type ThemeId = Theme;

/** A single selectable theme as shown in the Settings picker. */
export interface ThemeOption {
  /** Stable id — written to `data-theme` on <html> and to preferences. */
  id: ThemeId;
  /** Human-friendly name shown in Settings. */
  label: string;
}

/** The ordered list of themes shown in Settings. */
export const THEMES: readonly ThemeOption[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
] as const;

/** The theme used when nothing valid is stored. */
export const DEFAULT_THEME_ID: ThemeId = "light";

/**
 * Retired decorative themes → the supported theme they now render as.
 * Glass and Fairy were bright, airy looks; Neon and Starlight were night
 * looks. Kept in sync with the inline no-flash script in app/layout.tsx.
 */
export const LEGACY_THEME_MAP: Readonly<Record<string, ThemeId>> = {
  glass: "light",
  fairy: "light",
  neon: "dark",
  stars: "dark",
};

/** Narrowing guard: is this value one of the two supported theme ids? */
export function isThemeId(value: string | null | undefined): value is ThemeId {
  return value === "light" || value === "dark";
}

/**
 * Resolve any stored theme value — current or retired — to a supported theme.
 * Returns null when the value is missing or unrecognised so callers can fall
 * back to their own default (e.g. the server-saved preference).
 */
export function resolveThemeId(value: string | null | undefined): ThemeId | null {
  if (isThemeId(value)) {
    return value;
  }
  if (value != null && Object.hasOwn(LEGACY_THEME_MAP, value)) {
    return LEGACY_THEME_MAP[value];
  }
  return null;
}
