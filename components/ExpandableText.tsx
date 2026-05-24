"use client";

import { useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";

import styles from "./ExpandableText.module.css";

/**
 * ExpandableText — wraps long-form content with a "Read more / Read less"
 * toggle so feeds and archives stay scannable without losing access to the
 * full text.
 *
 * The decision to show the toggle is heuristic: the wrapper looks at the
 * length of the `source` string AND the number of newlines in it. That keeps
 * the component pure (no DOM measurement) so it is reliable in jsdom-based
 * tests, while still catching the "short but visually tall" case (e.g. a
 * markdown list of single-word items).
 *
 * Why source-based heuristic instead of `scrollHeight`:
 * - jsdom reports `scrollHeight === 0`, so any ResizeObserver-based variant
 *   would always claim the content fits and never render the toggle in tests.
 * - Components rendered inside Framer Motion or animated parents would also
 *   flicker between "no toggle" and "toggle" as parents resize.
 *
 * The collapsed state visually clamps the rendered children with CSS
 * `-webkit-line-clamp`, so the children may be anything — plain text, a
 * heading, or a `MarkdownText` block — and the clipping still works visually
 * without truncating the source string (which could break markdown syntax).
 */
export function ExpandableText({
  children,
  source,
  previewLines = 4,
  collapsedThreshold = 240,
  className,
  toggleClassName,
  readMoreLabel = "Read more",
  readLessLabel = "Read less",
  ariaLabel,
}: {
  /** The rendered content to clamp. */
  children: ReactNode;
  /** Raw source string used to decide whether a toggle is needed. */
  source: string;
  /** How many lines to show when collapsed (drives CSS `-webkit-line-clamp`). */
  previewLines?: number;
  /** Character-count threshold above which the toggle becomes available. */
  collapsedThreshold?: number;
  /** Extra class on the outer wrapper. */
  className?: string;
  /** Extra class on the toggle button. */
  toggleClassName?: string;
  readMoreLabel?: string;
  readLessLabel?: string;
  /** Optional accessible label override for the toggle (defaults to label text). */
  ariaLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  // Hybrid heuristic: long total length OR many soft line breaks. The line
  // check catches markdown that is short character-wise but visually tall
  // (e.g. a 5-item bulleted list).
  const trimmed = source.trim();
  const lineCount = trimmed.length === 0 ? 0 : trimmed.split(/\r?\n/).length;
  const isLong = trimmed.length > collapsedThreshold || lineCount > previewLines + 1;

  if (!isLong) {
    // Short content gets a transparent pass-through so the component is safe
    // to drop in everywhere without adding wrappers around tiny strings.
    return className ? <div className={className}>{children}</div> : <>{children}</>;
  }

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    // Reusable components may sit inside a clickable card; stop propagation
    // so toggling "Read more" never accidentally activates the parent.
    event.stopPropagation();
    setExpanded((current) => !current);
  };

  const clampStyle: CSSProperties = !expanded
    ? ({ ["--expandable-lines" as string]: previewLines } as CSSProperties)
    : ({} as CSSProperties);

  return (
    <div className={`${styles.wrapper}${className ? ` ${className}` : ""}`}>
      <div
        className={expanded ? styles.expanded : styles.clamped}
        style={clampStyle}
        data-testid="expandable-text-body"
      >
        {children}
      </div>
      <button
        type="button"
        className={`btn btn-sm btn-ghost ${styles.toggle}${toggleClassName ? ` ${toggleClassName}` : ""}`}
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-label={ariaLabel ?? (expanded ? readLessLabel : readMoreLabel)}
      >
        {expanded ? readLessLabel : readMoreLabel}
      </button>
    </div>
  );
}
