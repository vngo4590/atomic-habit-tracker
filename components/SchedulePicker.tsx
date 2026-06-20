"use client";

import { motion } from "framer-motion";

import { formatScheduleLabel } from "@/lib/schedule";

import styles from "./SchedulePicker.module.css";

/** Weekday tokens in display order. */
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Schedule presets. Each maps to a list of weekday tokens. */
export const PRESETS = {
  daily: { label: "Every day", days: [...DAYS] },
  weekdays: { label: "Weekdays", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  weekends: { label: "Weekends", days: ["Sun", "Sat"] },
  three: { label: "3x a week", days: ["Mon", "Wed", "Fri"] },
  custom: { label: "Custom", days: [] },
} as const;

export type Preset = keyof typeof PRESETS;

/**
 * Map the canonical schedule labels that formatScheduleLabel produces back to
 * the preset key that generates them. Note "Daily" (the canonical label) is
 * produced from the "Every day" preset label, so it is keyed explicitly here.
 */
const LABEL_TO_PRESET: Record<string, Preset> = {
  Daily: "daily",
  Weekdays: "weekdays",
  Weekends: "weekends",
  "3x a week": "three",
};

/**
 * Turn the picker's local state into the schedule label we persist on the
 * habit (e.g. "Daily", "Weekdays", "Mon, Wed, Fri"). Custom selections are
 * normalised through formatScheduleLabel so a recognised day set still collapses
 * to its friendly preset name.
 */
export function scheduleLabelFromState(preset: Preset, customDays: string[]): string {
  return preset === "custom"
    ? formatScheduleLabel(customDays.join(", ") || "Custom")
    : formatScheduleLabel(PRESETS[preset].label);
}

/**
 * Inverse of scheduleLabelFromState: derive the picker state from a stored
 * schedule label so the edit panel opens with the habit's current schedule
 * already selected.
 */
export function scheduleStateFromLabel(schedule: string): { preset: Preset; customDays: string[] } {
  const label = formatScheduleLabel(schedule);
  const preset = LABEL_TO_PRESET[label];
  if (preset) {
    return { preset, customDays: [] };
  }
  // Unrecognised set — keep it as an explicit list of selected days.
  const selected = label.split(",").map((day) => day.trim());
  const customDays = DAYS.filter((day) => selected.includes(day));
  return { preset: "custom", customDays };
}

/**
 * SchedulePicker — the shared schedule editor (preset chips + day-of-week grid
 * + legend) used by both the create-habit page and the edit-habit panel. The
 * parent owns the preset/customDays state so it can compute the persisted label
 * via scheduleLabelFromState when saving.
 */
export function SchedulePicker({
  preset,
  customDays,
  onPresetChange,
  onToggleDay,
}: {
  preset: Preset;
  customDays: string[];
  onPresetChange: (preset: Preset) => void;
  onToggleDay: (day: string) => void;
}) {
  // Which day pills should read as "scheduled" for the current selection.
  const activeDays: readonly string[] = preset === "custom" ? customDays : PRESETS[preset].days;

  return (
    <section className="card card-pad">
      <div className="eyebrow">Schedule</div>
      <div className={styles.presetRow}>
        {(Object.keys(PRESETS) as Preset[]).map((key) => (
          <motion.button
            key={key}
            className={`chip ${preset === key ? "active" : ""}`}
            type="button"
            onClick={() => onPresetChange(key)}
            whileTap={{ scale: 0.95 }}
          >
            {PRESETS[key].label}
          </motion.button>
        ))}
      </div>
      {/* Day-of-week toggles. Uses the .day-grid global class so the
          mobile layout override does not force each day onto its own row. */}
      <div className={`day-grid ${styles.dayGridSpacer}`}>
        {DAYS.map((day) => (
          <motion.button
            key={day}
            className={`btn btn-sm ${activeDays.includes(day) ? "btn-primary" : ""}`}
            type="button"
            onClick={() => onToggleDay(day)}
            whileTap={{ scale: 0.95 }}
          >
            {day}
          </motion.button>
        ))}
      </div>
      {/* Legend so the meaning of the selected vs. unselected day pills is
          explicit. We render miniature pills styled the same way as the day
          buttons so the legend stays correct in both light and dark themes. */}
      <div className={styles.dayLegend} aria-label="Day selector legend">
        <span className={styles.dayLegendItem}>
          <span className={`btn btn-sm btn-primary ${styles.dayLegendSwatch}`} aria-hidden="true" />
          <span className={styles.dayLegendLabel}>Scheduled</span>
        </span>
        <span className={styles.dayLegendItem}>
          <span className={`btn btn-sm ${styles.dayLegendSwatch}`} aria-hidden="true" />
          <span className={styles.dayLegendLabel}>Off</span>
        </span>
      </div>
    </section>
  );
}
