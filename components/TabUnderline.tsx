"use client";

import { motion } from "framer-motion";

import styles from "./TabUnderline.module.css";

/**
 * TabUnderline — the sliding accent underline that marks the active tab.
 *
 * Drop this inside the *active* tab button of a `.tabs` group. All tabs in one
 * group must pass the same `groupId` so Framer Motion's shared-layout animation
 * slides a single underline between tabs instead of cross-fading. Keep
 * `groupId` unique per on-screen tab group so unrelated groups don't link up.
 */
export function TabUnderline({ groupId }: { groupId: string }) {
  return (
    <motion.span
      className={styles.underline}
      layoutId={`tab-underline-${groupId}`}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
    />
  );
}
