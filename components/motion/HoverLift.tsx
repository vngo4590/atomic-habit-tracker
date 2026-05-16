"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface HoverLiftProps {
  children: ReactNode;
  className?: string;
  y?: number;
  shadow?: string;
}

export function HoverLift({ children, className, y = -2, shadow = "var(--shadow-md)" }: HoverLiftProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ y, boxShadow: shadow, borderColor: "var(--rule-strong)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}
