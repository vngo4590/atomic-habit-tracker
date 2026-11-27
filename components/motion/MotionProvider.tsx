"use client";

import { LazyMotion } from "framer-motion";
import type { ReactNode } from "react";

// The animation feature bundle (~15 KB gz) is fetched after first paint instead of
// shipping in every route's first-load bundle. `m.*` components render their
// initial state immediately and start animating once the features arrive.
const loadFeatures = () => import("./motion-features").then((mod) => mod.default);

/**
 * Wraps the app so `m.*` components share one lazily loaded feature bundle.
 * Use `m` (not `motion`) from framer-motion inside this provider.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={loadFeatures}>{children}</LazyMotion>;
}
