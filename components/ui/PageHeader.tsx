import type { ReactNode } from "react";

import styles from "./PageHeader.module.css";

export interface PageHeaderProps {
  /** The page's single <h1>. */
  title: ReactNode;
  /** Optional one-line explanation under the title. */
  subtitle?: ReactNode;
  /** Optional small label above the title (section name). */
  eyebrow?: ReactNode;
  /** Buttons on the right (desktop) / below (mobile). One primary at most. */
  actions?: ReactNode;
}

/**
 * PageHeader — consistent title, subtitle and actions row for every page.
 * Renders the page's only <h1> so the document outline stays correct.
 */
export function PageHeader({ title, subtitle, eyebrow, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
