import type { ReactNode } from "react";

import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  /** Decorative Lucide icon. */
  icon?: ReactNode;
  title: string;
  /** One or two sentences explaining what goes here and why it's empty. */
  children?: ReactNode;
  /** The next step — usually a primary <Button>. */
  action?: ReactNode;
  /** Heading level for the title so it fits the page outline. */
  headingLevel?: 2 | 3;
}

/**
 * EmptyState — shown when a list has nothing in it yet. Every list in the app
 * should offer one with a clear next step (MASTER: "empty state with a CTA").
 */
export function EmptyState({ icon, title, children, action, headingLevel = 2 }: EmptyStateProps) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div className={styles.empty}>
      {icon ? (
        <div className={styles.icon} aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <Heading className={styles.title}>{title}</Heading>
      {children ? <p className={styles.text}>{children}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
