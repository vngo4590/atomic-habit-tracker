import type { HTMLAttributes, ReactNode } from "react";

import styles from "./Badge.module.css";

export type BadgeTone = "neutral" | "primary" | "warning" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children: ReactNode;
}

/**
 * Badge — a compact, non-interactive status label. Colour is never the only
 * signal: the text itself must say what the status is.
 */
export function Badge({ tone = "neutral", className, children, ...rest }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[tone], className ?? ""].filter(Boolean).join(" ")} {...rest}>
      {children}
    </span>
  );
}
