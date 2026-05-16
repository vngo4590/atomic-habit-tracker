"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the user prefers reduced motion OR when the viewport
 * is narrow enough that complex Framer Motion animations cause jank.
 * This keeps the app smooth on phones while respecting accessibility
 * preferences on all devices.
 */
export function useMotionReduced(): boolean {
  const [reduced, setReduced] = useState(() => {
    // Default to reduced motion in test environments or when matchMedia is unavailable.
    if (typeof window === "undefined" || !window.matchMedia) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const check = () => {
      const isMobile = window.innerWidth <= 900;
      setReduced(mq.matches || isMobile);
    };
    check();
    mq.addEventListener("change", check);
    window.addEventListener("resize", check);
    return () => {
      mq.removeEventListener("change", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  return reduced;
}
