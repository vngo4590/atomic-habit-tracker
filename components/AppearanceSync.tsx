"use client";

import { useEffect } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { applyAppearance, readLegacyTheme } from "@/lib/appearance";

/**
 * AppearanceSync — keeps <html> in step with the user's saved theme and
 * accent hue. Renders nothing; mounted once in the authenticated layout.
 *
 * One-time migration: if the browser still remembers a retired decorative
 * theme (e.g. "neon"), it wins once — mapped to its nearest supported theme —
 * and is written back to the server preference so every device agrees.
 * applyAppearance then deletes the legacy key so this only ever happens once.
 */
export function AppearanceSync() {
  const store = useStoreContext();
  const { accentHue, theme } = store.preferences;
  const { setPreferences } = store;

  useEffect(() => {
    const legacy = readLegacyTheme();
    const resolved = legacy ?? theme;
    applyAppearance(resolved, accentHue);
    if (legacy && legacy !== theme) {
      setPreferences({ theme: legacy });
    }
  }, [accentHue, theme, setPreferences]);

  return null;
}
