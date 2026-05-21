"use client";

import ReactMarkdown from "react-markdown";

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
    <div className={className} style={style}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p style={{ margin: 0 }}>{children}</p>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
