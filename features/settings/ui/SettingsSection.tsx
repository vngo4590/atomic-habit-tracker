import type { ReactNode } from "react";

import { Card } from "@/components/ui";

import styles from "./SettingsSection.module.css";

/**
 * SettingsSection — one titled group on the Settings page (Profile,
 * Appearance, ...). Rendered as a labelled <section> with an `id` so the
 * desktop section nav can deep-link to it with a plain `#anchor`.
 */
export function SettingsSection({
  id,
  title,
  description,
  danger = false,
  children,
}: {
  /** Anchor id used by the section nav (e.g. "appearance"). */
  id: string;
  title: string;
  /** One sentence explaining what lives in this group. */
  description?: string;
  /** Danger zone styling (destructive actions). */
  danger?: boolean;
  children: ReactNode;
}) {
  const headingId = `${id}-title`;
  return (
    <Card
      as="section"
      padding="none"
      id={id}
      aria-labelledby={headingId}
      className={[styles.section, danger ? styles.danger : ""].filter(Boolean).join(" ")}
    >
      <header className={styles.header}>
        <h2 id={headingId} className={styles.title}>
          {title}
        </h2>
        {description ? <p className={styles.description}>{description}</p> : null}
      </header>
      <div className={styles.rows}>{children}</div>
    </Card>
  );
}

/**
 * SettingRow — label (+ optional current value / hint) on the left and a
 * single action on the right; stacks on narrow screens. `children` render
 * full-width under the row for inline editors (progressive disclosure).
 */
export function SettingRow({
  label,
  value,
  hint,
  action,
  children,
}: {
  label: string;
  /** Current value, shown under the label (e.g. the user's email). */
  value?: ReactNode;
  /** Secondary explanation when there's no value to show. */
  hint?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.rowMain}>
        <div className={styles.rowText}>
          <p className={styles.label}>{label}</p>
          {value !== undefined ? <div className={styles.value}>{value}</div> : null}
          {hint ? <p className={styles.hint}>{hint}</p> : null}
        </div>
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
      {children ? <div className={styles.panel}>{children}</div> : null}
    </div>
  );
}
