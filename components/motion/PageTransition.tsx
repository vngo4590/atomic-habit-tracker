"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { pageTransition } from "@/lib/animations";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  // No `mode="wait"` / `exit` here on purpose. With those, a navigation (or a
  // re-render from an in-flight server action, e.g. saving an accent-hue change)
  // that interrupts the enter animation can leave the incoming page stranded at
  // its `initial` opacity of 0 — a fully blank screen. Letting the new page fade
  // in over the outgoing one guarantees content always settles to opacity 1.
  return (
    <AnimatePresence>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={pageTransition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
