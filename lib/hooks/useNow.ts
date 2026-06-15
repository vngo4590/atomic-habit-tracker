"use client";

import { useEffect, useState } from "react";

/**
 * useNow returns the current epoch milliseconds and re-renders on a fixed
 * interval. The pet ecosystem decays in real time, so the UI uses this to keep
 * satiety bars and moods gently ticking forward without a manual refresh.
 *
 * The interval callback (not the render body) is what updates state, which keeps
 * it clear of the "no setState during render/effect" rule.
 */
export function useNow(intervalMs = 5000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
