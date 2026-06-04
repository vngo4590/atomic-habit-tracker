import type { Theme } from "@/lib/types";

const THEME_KEY = "atomicly:theme";
const ACCENT_KEY = "atomicly:accent";
// Mirror for the *named* theme variant (Glass/Neon/...). Stored only in the
// browser because it is a purely visual preference; see lib/themes.ts for why.
const VARIANT_KEY = "atomicly:theme-variant";

/**
 * Apply the user's appearance choices to the document and persist them.
 *
 * @param theme    The base light/dark mode (drives `data-theme` + token set).
 * @param accentHue The accent colour hue in oklch degrees.
 * @param variant  Optional named theme id (e.g. "glass"). When provided we set
 *                 `data-theme-variant` and persist it. When omitted we leave any
 *                 existing variant attribute/storage untouched, so callers that
 *                 only tweak the accent (e.g. the accent picker) never wipe the
 *                 user's chosen theme.
 */
export function applyAppearance(theme: Theme, accentHue: number, variant?: string) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.setProperty("--accent", `oklch(62% 0.13 ${accentHue})`);
  document.documentElement.style.setProperty("--accent-2", `oklch(72% 0.10 ${accentHue})`);
  document.documentElement.style.setProperty(
    "--accent-soft",
    theme === "dark" ? `oklch(28% 0.05 ${accentHue})` : `oklch(92% 0.04 ${accentHue})`,
  );
  window.localStorage.setItem(THEME_KEY, theme);
  window.localStorage.setItem(ACCENT_KEY, String(accentHue));

  if (variant !== undefined) {
    document.documentElement.dataset.themeVariant = variant;
    window.localStorage.setItem(VARIANT_KEY, variant);
  }
}

/**
 * Read the persisted theme-variant id from localStorage, if any. Returns null
 * when nothing is stored or storage is unavailable (SSR / privacy mode), so
 * callers can safely fall back to the base light/dark preference.
 */
export function readStoredVariant(): string | null {
  try {
    return window.localStorage.getItem(VARIANT_KEY);
  } catch {
    return null;
  }
}
