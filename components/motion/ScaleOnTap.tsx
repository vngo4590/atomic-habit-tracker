"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ScaleOnTapProps {
  children: ReactNode;
  className?: string;
  scale?: number;
  onClick?: () => void;
}

export function ScaleOnTap({ children, className, scale = 0.97, onClick }: ScaleOnTapProps) {
  return (
    <motion.div
      className={className}
      whileTap={{ scale }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      style={{ display: "inline-flex" }}
    >
      {children}
    </motion.div>
  );
}
