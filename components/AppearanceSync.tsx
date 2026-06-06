"use client";

import { useEffect } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { applyAppearance, readStoredVariant } from "@/lib/appearance";
import { getTheme, isThemeVariantId } from "@/lib/themes";

export function AppearanceSync() {
  const store = useStoreContext();
  const { accentHue, theme } = store.preferences;

  useEffect(() => {
    // The named theme variant lives only in localStorage. When a valid one is
    // stored it is the source of truth for the look (and dictates the base
    // light/dark mode), so a dark-based theme like "neon" survives a reload
    // instead of being overwritten by the server-persisted base preference.
    const storedVariant = readStoredVariant();
    const variant = isThemeVariantId(storedVariant) ? storedVariant : undefined;
    const base = variant ? getTheme(variant).base : theme;
    applyAppearance(base, accentHue, variant);
  }, [accentHue, theme]);

  return null;
}
