import { RouteTabs } from "@/components/ui";

import styles from "./SectionTabs.module.css";

/**
 * Section hub tabs (ADR-0003 IA).
 *
 * The nav groups several existing pages under one destination without moving
 * their URLs: "Reflect" = Journal | Weekly review, "Insights" = Analytics |
 * Hall of Fame. Each page's route layout renders the matching tab row above
 * the page so users can hop between siblings, while every old URL keeps
 * working (bookmarks, e2e specs). `/reflect` and `/insights` redirect to the
 * first tab (see next.config.ts).
 */

/** Pages that make up the Reflect hub, in tab order. */
export const REFLECT_TABS = [
  { href: "/journal", label: "Journal" },
  { href: "/review", label: "Weekly review" },
] as const;

/** Pages that make up the Insights hub, in tab order. */
export const INSIGHTS_TABS = [
  { href: "/analytics", label: "Analytics" },
  { href: "/hall-of-fame", label: "Hall of Fame" },
] as const;

/** Tab row for the Reflect hub, shown on /journal and /review. */
export function ReflectTabs() {
  return (
    <div className={styles.wrap}>
      <RouteTabs label="Reflect sections" tabs={REFLECT_TABS} />
    </div>
  );
}

/** Tab row for the Insights hub, shown on /analytics and /hall-of-fame. */
export function InsightsTabs() {
  return (
    <div className={styles.wrap}>
      <RouteTabs label="Insights sections" tabs={INSIGHTS_TABS} />
    </div>
  );
}
