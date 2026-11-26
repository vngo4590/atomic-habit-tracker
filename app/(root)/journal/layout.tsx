import type { ReactNode } from "react";

import { ReflectTabs } from "@/components/nav/SectionTabs";

/**
 * Journal route layout — renders the Reflect hub tab row (Journal | Weekly review) above the page so
 * users can switch between the sibling pages of that nav section.
 */
export default function JournalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ReflectTabs />
      {children}
    </>
  );
}