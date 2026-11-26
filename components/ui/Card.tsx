import type { HTMLAttributes, ReactNode } from "react";

import styles from "./Card.module.css";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Semantic element. Use "section"/"article" when the card has a heading. */
  as?: "div" | "section" | "article" | "li";
  /** Inner padding preset. "none" suits edge-to-edge lists. */
  padding?: "none" | "md" | "lg";
  children?: ReactNode;
}

const PADDING = { none: styles.padNone, md: styles.padMd, lg: styles.padLg } as const;

/**
 * Card — the calm raised surface used to group related content. Purely
 * presentational; interactive cards should wrap a real link/button inside.
 */
export function Card({ as: Element = "div", padding = "md", className, children, ...rest }: CardProps) {
  return (
    <Element className={[styles.card, PADDING[padding], className ?? ""].filter(Boolean).join(" ")} {...rest}>
      {children}
    </Element>
  );
}
