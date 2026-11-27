"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Enter-only page fade. Keying the wrapper on `pathname` remounts it on
 * navigation, which replays the CSS `page-enter` animation. Plain CSS keeps the
 * Framer Motion runtime out of the app shell (every route's first load).
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
