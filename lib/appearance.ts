import type { Theme } from "@/lib/types";

const THEME_KEY = "atomicly:theme";
const ACCENT_KEY = "atomicly:accent";

export function applyAppearance(theme: Theme, accentHue: number) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.setProperty("--accent", `oklch(62% 0.13 ${accentHue})`);
  document.documentElement.style.setProperty("--accent-2", `oklch(72% 0.10 ${accentHue})`);
  document.documentElement.style.setProperty(
    "--accent-soft",
    theme === "dark" ? `oklch(28% 0.05 ${accentHue})` : `oklch(92% 0.04 ${accentHue})`,
  );
  window.localStorage.setItem(THEME_KEY, theme);
  window.localStorage.setItem(ACCENT_KEY, String(accentHue));
}
