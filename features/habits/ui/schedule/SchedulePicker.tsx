"use client";

import { DAYS, PRESETS, type Preset } from "./schedule-state";
import styles from "./SchedulePicker.module.css";

export interface SchedulePickerProps {
  preset: Preset;
  customDays: string[];
  onPresetChange: (preset: Preset) => void;
  onToggleDay: (day: string) => void;
  /** Visible group label. */
  legend?: string;
}

/**
 * SchedulePicker — preset chips plus a seven-day toggle row, used by the
 * create wizard and the habit edit panel. The parent owns the state and turns
 * it into the stored label with `scheduleLabelFromState`. Presets and days are
 * toggle buttons (`aria-pressed`) inside a labelled fieldset.
 */
export function SchedulePicker({
  preset,
  customDays,
  onPresetChange,
  onToggleDay,
  legend = "Which days?",
}: SchedulePickerProps) {
  const activeDays: readonly string[] = preset === "custom" ? customDays : PRESETS[preset].days;

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>

      <div className={styles.presets} role="group" aria-label="Schedule presets">
        {(Object.keys(PRESETS) as Preset[]).map((key) => (
          <button
            key={key}
            type="button"
            className={styles.preset}
            aria-pressed={preset === key}
            onClick={() => onPresetChange(key)}
          >
            {PRESETS[key].label}
          </button>
        ))}
      </div>

      <div className={styles.days} role="group" aria-label="Days of the week">
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            className={styles.day}
            aria-pressed={activeDays.includes(day)}
            onClick={() => onToggleDay(day)}
          >
            {day}
          </button>
        ))}
      </div>

      <div className={styles.key} role="group" aria-label="Day selector legend">
        <span className={styles.keyItem}>
          <span className={`${styles.swatch} ${styles.swatchOn}`} aria-hidden="true" />
          Scheduled
        </span>
        <span className={styles.keyItem}>
          <span className={styles.swatch} aria-hidden="true" />
          Off
        </span>
      </div>
    </fieldset>
  );
}
