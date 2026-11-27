/**
 * schedule-state — pure mapping between the SchedulePicker's local state
 * (a preset or a custom day list) and the schedule label stored on a habit.
 */

import { formatScheduleLabel } from "../../model/schedule";

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

/** Canonical labels from formatScheduleLabel → the preset that produces them. */
const LABEL_TO_PRESET: Record<string, Preset> = {
  Daily: "daily",
  Weekdays: "weekdays",
  Weekends: "weekends",
  "3x a week": "three",
};

/**
 * The schedule label to persist (e.g. "Daily", "Weekdays", "Mon, Wed, Fri").
 * Custom selections go through formatScheduleLabel so a recognised day set
 * still collapses to its friendly preset name.
 */
export function scheduleLabelFromState(preset: Preset, customDays: string[]): string {
  return preset === "custom"
    ? formatScheduleLabel(customDays.join(", ") || "Custom")
    : formatScheduleLabel(PRESETS[preset].label);
}

/** Inverse of scheduleLabelFromState, so the edit panel opens pre-selected. */
export function scheduleStateFromLabel(schedule: string): { preset: Preset; customDays: string[] } {
  const label = formatScheduleLabel(schedule);
  const preset = LABEL_TO_PRESET[label];
  if (preset) return { preset, customDays: [] };
  const selected = label.split(",").map((day) => day.trim());
  return { preset: "custom", customDays: DAYS.filter((day) => selected.includes(day)) };
}

/**
 * Toggle one day. Starting from a preset, the preset's days become the
 * starting point, so tapping "Sat" on Weekdays gives Mon–Sat rather than
 * just Sat.
 */
export function toggleScheduleDay(preset: Preset, customDays: string[], day: string): string[] {
  const base: string[] = preset === "custom" ? customDays : [...PRESETS[preset].days];
  const next = base.includes(day) ? base.filter((item) => item !== day) : [...base, day];
  return DAYS.filter((item) => next.includes(item));
}
