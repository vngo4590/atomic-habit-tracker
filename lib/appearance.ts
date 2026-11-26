import { resolveThemeId } from "@/lib/themes";
import type { Theme } from "@/lib/types";

const THEME_KEY = "atomicly:theme";
const ACCENT_KEY = "atomicly:accent";
// Legacy key that remembered a retired decorative theme (Glass/Neon/...).
// We still read it once so those users land on the nearest supported theme,
// then delete it so the server-saved preference becomes the only source.
const LEGACY_VARIANT_KEY = "atomicly:theme-variant";

/**
 * The primary accent colour for a given hue, matching the light-theme
 * `--primary` token in app/styles/tokens.css. Used by the hue picker preview
 * so the swatch shows the colour buttons will actually use.
 */
export function accentColor(hue: number): string {
  return `oklch(0.48 0.09 ${hue})`;
}

/**
 * Apply the user's appearance choices to the document and remember them in
 * localStorage so the no-flash script can restore them before first paint.
 *
 * @param theme     Light or dark (drives `data-theme` and the token set).
 * @param accentHue Accent hue in OKLCH degrees; every accent colour token is
 *                  derived from it in CSS via `--accent-hue`.
 */
export function applyAppearance(theme: Theme, accentHue: number) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.setProperty("--accent-hue", String(accentHue));
  // Clear any leftover attribute from the retired theme-variant system so no
  // stale selector could ever match.
  root.removeAttribute("data-theme-variant");

  try {
    window.localStorage.setItem(THEME_KEY, theme);
    window.localStorage.setItem(ACCENT_KEY, String(accentHue));
    window.localStorage.removeItem(LEGACY_VARIANT_KEY);
  } catch {
    // Storage can be unavailable (privacy mode). The DOM is already updated,
    // so the only cost is a possible flash on the next reload.
  }
}

/**
 * Read a retired theme-variant id left in localStorage (e.g. "neon") and map
 * it to the supported theme it now renders as. Returns null when nothing is
 * stored, the value is unknown, or storage is unavailable.
 */
export function readLegacyTheme(): Theme | null {
  try {
    return resolveThemeId(window.localStorage.getItem(LEGACY_VARIANT_KEY));
  } catch {
    return null;
  }
}
