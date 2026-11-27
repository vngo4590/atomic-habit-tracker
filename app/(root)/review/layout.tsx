import type { ReactNode } from "react";

import { ReflectTabs } from "@/components/nav/SectionTabs";

/**
 * Weekly review route layout — renders the Reflect hub tab row (Journal | Weekly review) above the page so
 * users can switch between the sibling pages of that nav section.
 */
export default function ReviewLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ReflectTabs />
      {children}
    </>
  );
}