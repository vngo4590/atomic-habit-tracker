/**
 * themes.ts — the registry of selectable visual themes ("theme variants").
 *
 * What this is, in plain language:
 *   The app already supports a basic light/dark mode (persisted in the
 *   database). On top of that we let people pick a richer *named* look — Glass,
 *   Neon, Fairy, Starlight — each of which is really just "a light or dark base
 *   plus a bundle of CSS overrides plus a signature click animation".
 *
 * Why a separate registry (and not new database columns):
 *   A theme variant is a purely visual preference. Storing it in the database
 *   would need a risky schema migration, so instead the chosen variant id is
 *   mirrored in the browser's localStorage (see lib/appearance.ts). The base
 *   light/dark mode of the chosen variant is still saved to the database via
 *   the existing `theme` preference, so a reload restores the correct mode even
 *   before localStorage is read.
 *
 * Adding a new theme later is intentionally trivial: append one entry here,
 * add a matching `[data-theme-variant="<id>"]` block in app/styles/themes.css,
 * and it automatically appears in the Settings gallery and the click-effect
 * layer. Everything else reads from this single source of truth.
 */

/** The underlying light/dark mode a variant renders on top of. */
export type ThemeBase = "light" | "dark";

/**
 * The signature animation that plays where the user clicks. Each variant maps
 * to one of these so the feedback feels on-brand for the chosen look.
 */
export type ClickEffect = "ripple" | "sparkle" | "bubble" | "none";

/** Which heading font family a variant uses (editorial serif vs modern sans). */
export type DisplayFont = "serif" | "sans";

/** The set of valid theme ids. Kept as a union so CSS/UI/effects can't drift. */
export type ThemeVariantId = "light" | "dark" | "glass" | "neon" | "fairy" | "stars";

/** A single selectable theme and everything the UI needs to describe it. */
export interface ThemeOption {
  /** Stable id — used as the `data-theme-variant` value and storage key value. */
  id: ThemeVariantId;
  /** Human-friendly name shown on the Settings theme card. */
  label: string;
  /** One-line description shown under the label in the gallery. */
  description: string;
  /** Light or dark mode this variant builds on (drives `data-theme`). */
  base: ThemeBase;
  /** Pointer animation that plays on click while this theme is active. */
  clickEffect: ClickEffect;
  /** Heading font: serif keeps the editorial default; sans reads as modern. */
  display: DisplayFont;
  /**
   * Two static CSS colours used to paint the little preview swatch on the
   * Settings card. These are intentionally literal colours (not design tokens)
   * so the preview looks the same regardless of the currently active theme.
   */
  swatch: { from: string; to: string };
}

/**
 * The ordered list of themes shown in the Settings gallery. Order matters:
 * the two defaults come first, then the richer decorative themes.
 */
export const THEMES: readonly ThemeOption[] = [
  {
    id: "light",
    label: "Bright",
    description: "Clean editorial daylight.",
    base: "light",
    clickEffect: "ripple",
    display: "serif",
    swatch: { from: "#fbf8f2", to: "#e9e2d4" },
  },
  {
    id: "dark",
    label: "Midnight",
    description: "Calm, low-light focus.",
    base: "dark",
    clickEffect: "ripple",
    display: "serif",
    swatch: { from: "#2a2622", to: "#16130f" },
  },
  {
    id: "glass",
    label: "Glass",
    description: "Frosted, iPhone-style panels.",
    base: "light",
    clickEffect: "bubble",
    display: "sans",
    swatch: { from: "#dbe7ff", to: "#a9c6f5" },
  },
  {
    id: "neon",
    label: "Neon",
    description: "Vivid cyber glow on black.",
    base: "dark",
    clickEffect: "sparkle",
    display: "sans",
    swatch: { from: "#ff3df0", to: "#16f2ff" },
  },
  {
    id: "fairy",
    label: "Fairy",
    description: "Soft pastel dreamscape.",
    base: "light",
    clickEffect: "sparkle",
    display: "sans",
    swatch: { from: "#ffd6f4", to: "#c6b6ff" },
  },
  {
    id: "stars",
    label: "Starlight",
    description: "A sparkling night sky.",
    base: "dark",
    clickEffect: "sparkle",
    display: "sans",
    swatch: { from: "#101a3a", to: "#2a1a4f" },
  },
] as const;

/** The theme used when nothing valid is stored — matches the app's origin look. */
export const DEFAULT_THEME_ID: ThemeVariantId = "light";

// Fast id -> option lookup so getTheme stays O(1) no matter how many themes exist.
const THEME_BY_ID = new Map<ThemeVariantId, ThemeOption>(
  THEMES.map((theme) => [theme.id, theme]),
);

/**
 * Narrowing guard: is this arbitrary string one of our known theme ids?
 * Used to validate values read from localStorage before we trust them.
 */
export function isThemeVariantId(value: string | null | undefined): value is ThemeVariantId {
  return value != null && THEME_BY_ID.has(value as ThemeVariantId);
}

/**
 * Resolve an id (possibly null/unknown, e.g. from storage) to a real theme,
 * always falling back to the default so callers never deal with `undefined`.
 */
export function getTheme(id: string | null | undefined): ThemeOption {
  if (isThemeVariantId(id)) {
    return THEME_BY_ID.get(id)!;
  }
  return THEME_BY_ID.get(DEFAULT_THEME_ID)!;
}
