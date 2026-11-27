"use client";

import { LazyMotion } from "framer-motion";
import type { ReactNode } from "react";

import { clientLogger } from "@/lib/logger-client";

// The animation feature bundle (~15 KB gz) is fetched after first paint instead of
// shipping in every route's first-load bundle. `m.*` components render their
// initial state immediately and start animating once the features arrive.
const importFeatures = () => import("./motion-features").then((mod) => mod.default);

/**
 * Load the features, retrying once. If the chunk still can't load (offline,
 * stale deploy), `m.*` elements would stay frozen in their hidden initial
 * state, so flag the page and let CSS show everything without animation.
 */
export async function loadFeatures(load = importFeatures) {
  try {
    return await load();
  } catch {
    try {
      return await load();
    } catch (error) {
      document.documentElement.classList.add("motion-unavailable");
      clientLogger.warn("Animation features failed to load", { event: "motion.features_failed", error });
      // Never settle: LazyMotion keeps rendering static elements.
      return new Promise<never>(() => {});
    }
  }
}

/**
 * Wraps the app so `m.*` components share one lazily loaded feature bundle.
 * Use `m` (not `motion`) from framer-motion inside this provider.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={loadFeatures}>{children}</LazyMotion>;
}
