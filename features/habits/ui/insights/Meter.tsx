import styles from "./Meter.module.css";

interface MeterProps {
  /** 0–100. */
  pct: number;
  /**
   * Accessible name. When set the bar is exposed as a progressbar; when
   * omitted it is decorative (the number is already shown as text nearby).
   */
  label?: string;
  /** Text read out instead of the bare percentage, e.g. "12 of 66 days". */
  valueText?: string;
  tone?: "primary" | "warning";
}

/** Meter — thin rounded bar whose fill width comes from a --pct custom property. */
export function Meter({ pct, label, valueText, tone = "primary" }: MeterProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const a11y = label
    ? {
        role: "progressbar",
        "aria-label": label,
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": clamped,
        "aria-valuetext": valueText,
      }
    : { "aria-hidden": true };
  return (
    <div className={styles.track} data-tone={tone} {...a11y}>
      {/* Width is data-driven, so it is passed as a custom property. */}
      <div className={styles.fill} style={{ ["--pct" as string]: `${clamped}%` }} />
    </div>
  );
}
