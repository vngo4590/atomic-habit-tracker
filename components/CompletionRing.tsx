"use client";

import { motion } from "framer-motion";

export function CompletionRing({ pct }: { pct: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
      <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--rule)" strokeWidth="4" />
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
