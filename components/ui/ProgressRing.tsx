import type { ReactNode } from "react";

import styles from "./ProgressRing.module.css";

export interface ProgressRingProps {
  /** Progress from 0 to 1 (values outside are clamped). */
  value: number;
  /** Diameter in px. */
  size?: number;
  /** Ring thickness in px. */
  strokeWidth?: number;
  /** Accessible description, e.g. "Today's habits completed". */
  label: string;
  /** Optional content in the centre (defaults to the rounded percentage). */
  children?: ReactNode;
}

/**
 * ProgressRing — a circular progress indicator exposed to assistive tech as
 * a `progressbar` with its percentage, so the ring is never colour-only.
 * The arc animates via a CSS transition that reduced-motion collapses to 0.
 */
export function ProgressRing({ value, size = 64, strokeWidth = 6, label, children }: ProgressRingProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const percent = Math.round(clamped * 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={styles.ring}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <svg className={styles.svg} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className={styles.track} cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} />
        <circle
          className={styles.indicator}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </svg>
      <span className={styles.label} aria-hidden="true">
        {children ?? `${percent}%`}
      </span>
    </div>
  );
}
