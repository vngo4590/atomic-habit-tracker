"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { pageTransition } from "@/lib/animations";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  // Enter-only transition on purpose — no `AnimatePresence`/`exit`. This is a
  // pure fade-in: keying the `motion.div` on `pathname` makes React remount it
  // on navigation, replaying `initial` -> `animate`. `AnimatePresence` without an
  // `exit` animation would keep the previous route's node mounted while the new
  // one mounts, leaving both stacked in the DOM (the "duplicated page" bug).
  // Because the incoming page is always immediately in the tree and `animate`
  // drives it to opacity 1, content also never gets stranded at a blank screen.
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}
