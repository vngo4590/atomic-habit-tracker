"use client";

import { motion } from "framer-motion";

import styles from "./CompletionRing.module.css";

/**
 * CompletionRing — animated circular progress indicator (0-100%).
 *
 * Renders a 64x64 SVG with two stacked circles: a static rule-coloured
 * track and an animated accent-coloured arc whose dash-offset reflects
 * the supplied `pct`. The centre shows the integer percentage in serif.
 */
export function CompletionRing({ pct }: { pct: number }) {
  // Geometry — radius and full-circle circumference used to compute the
  // dash-offset that produces the arc.
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className={styles.ring}>
      {/* Background track — full circle in the rule colour. */}
      <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--rule)" strokeWidth="4" />
      {/* Foreground arc — animated from 0 to the supplied percentage. */}
      <motion.circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeLinecap="round"
        transform="rotate(-90 32 32)"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      />
      <text x="32" y="36" textAnchor="middle" fontFamily="var(--serif)" fontSize="16" fill="var(--ink)">
        {pct}%
      </text>
    </svg>
  );
}
