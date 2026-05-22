"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders a markdown string with full block-element support (headings, lists,
 * blockquotes, code blocks, tables, etc.). Tailwind 4's preflight strips
 * default element styles; the `.markdown-body` class below restores them for
 * markdown-rendered content.
 */
export function MarkdownText({
  children,
  className,
  style,
}: {
  children: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`markdown-body${className ? ` ${className}` : ""}`} style={style}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
