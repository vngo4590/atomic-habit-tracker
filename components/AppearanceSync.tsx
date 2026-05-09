"use client";

import { useEffect } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { applyAppearance } from "@/lib/appearance";

export function AppearanceSync() {
  const store = useStoreContext();
  const { accentHue, theme } = store.preferences;

  useEffect(() => {
    applyAppearance(theme, accentHue);
  }, [accentHue, theme]);

  return null;
}
