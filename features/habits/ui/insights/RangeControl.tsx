"use client";

import { RANGES, type RangeDays } from "./analytics-data";
import styles from "./RangeControl.module.css";

interface RangeControlProps {
  value: RangeDays;
  onChange: (value: RangeDays) => void;
}

/** Segmented 14 / 30 / 90-day range picker (aria-pressed toggle buttons). */
export function RangeControl({ value, onChange }: RangeControlProps) {
  return (
    <div className={styles.segmented} role="group" aria-label="Date range">
      {RANGES.map((days) => (
        <button
          key={days}
          type="button"
          className={styles.option}
          aria-pressed={value === days}
          onClick={() => onChange(days)}
        >
          {days} days
        </button>
      ))}
    </div>
  );
}
