"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import styles from "./ScaleOnTap.module.css";

interface ScaleOnTapProps {
  children: ReactNode;
  className?: string;
  /** Final scale value at the peak of the tap (defaults to 0.97). */
  scale?: number;
  onClick?: () => void;
}

/**
 * ScaleOnTap — wraps interactive children with a spring-physics tap
 * animation. Used to give buttons, chips, and small icons a tactile
 * "press" response on click without rewriting motion props at each
 * call site.
 */
export function ScaleOnTap({ children, className, scale = 0.97, onClick }: ScaleOnTapProps) {
  return (
    <motion.div
      className={className ? `${styles.root} ${className}` : styles.root}
      whileTap={{ scale }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
