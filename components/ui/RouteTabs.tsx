"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./Tabs.module.css";

export interface RouteTab {
  href: string;
  label: string;
}

export interface RouteTabsProps {
  /** Accessible name for the navigation landmark, e.g. "Reflect sections". */
  label: string;
  tabs: readonly RouteTab[];
}

/**
 * RouteTabs — a tab-styled row of links where each "tab" is its own URL
 * (e.g. Reflect → /journal | /review). Because they navigate, these are
 * links in a <nav> with `aria-current="page"`, not ARIA tabs — every page
 * stays deep-linkable and the browser back button just works. Shares the
 * visual style of <Tabs>.
 */
export function RouteTabs({ label, tabs }: RouteTabsProps) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <div className={styles.list}>
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={styles.tab}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
