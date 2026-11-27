import type { CSSProperties } from "react";

import styles from "./Skeleton.module.css";

export interface SkeletonProps {
  /** "block" for cards/images, "text" for a line of copy, "circle" for avatars. */
  shape?: "block" | "text" | "circle";
  /** Width/height (any CSS length). Match the final content to avoid layout shift. */
  width?: string | number;
  height?: string | number;
  className?: string;
}

/**
 * Skeleton — a loading placeholder sized to match the content it stands in
 * for, so nothing jumps when the real data arrives (no CLS). Hidden from
 * assistive tech; the surrounding region should carry aria-busy instead.
 */
export function Skeleton({ shape = "block", width, height, className }: SkeletonProps) {
  // Dynamic size passthrough: dimensions are per-instance data, not static style.
  const size: CSSProperties = { width, height };
  const shapeClass = shape === "text" ? styles.text : shape === "circle" ? styles.circle : "";
  return (
    <span
      aria-hidden="true"
      className={[styles.skeleton, shapeClass, className ?? ""].filter(Boolean).join(" ")}
      style={size}
    />
  );
}
