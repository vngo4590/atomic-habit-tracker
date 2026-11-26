import type { ReactNode } from "react";

import { InsightsTabs } from "@/components/nav/SectionTabs";

/**
 * Analytics route layout — renders the Insights hub tab row (Analytics | Hall of Fame) above the page so
 * users can switch between the sibling pages of that nav section.
 */
export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <InsightsTabs />
      {children}
    </>
  );
}