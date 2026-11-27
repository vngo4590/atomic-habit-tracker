"use client";

import { lazy, Suspense } from "react";

import styles from "./LazyMarkdown.module.css";

// react-markdown + remark-gfm are the heaviest client dependencies on the
// reflection pages, so they load in their own chunk on first use instead of
// shipping in every route's first-load JS.
const MarkdownText = lazy(() =>
  import("@/components/MarkdownText").then((module) => ({ default: module.MarkdownText })),
);

interface LazyMarkdownProps {
  children: string;
  className?: string;
}

/**
 * LazyMarkdown — renders user-written markdown, showing the raw text (with
 * line breaks preserved) while the markdown renderer chunk loads, so the
 * words are readable immediately and the layout barely shifts.
 */
export function LazyMarkdown({ children, className }: LazyMarkdownProps) {
  return (
    <Suspense
      fallback={<div className={[styles.plain, className ?? ""].filter(Boolean).join(" ")}>{children}</div>}
    >
      <MarkdownText className={className}>{children}</MarkdownText>
    </Suspense>
  );
}
