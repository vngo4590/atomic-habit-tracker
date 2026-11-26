/**
 * nav-items.ts — the single source of truth for the app's information
 * architecture (ADR-0003): which top-level destinations exist, which URLs
 * count as "inside" each one, and the keyboard shortcuts.
 *
 * Sidebar (desktop), bottom tab bar (mobile) and the mobile top-bar title all
 * read from here so the three can never disagree about where the user is.
 */
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

import { IconChart, IconJournal, IconList, IconPet, IconSettings, IconToday } from "@/components/Icons";

export interface NavItem {
  /** Where the item links to (the section's landing page). */
  href: string;
  label: string;
  icon: ComponentType<LucideProps>;
  /** URL prefixes that belong to this section (for the active state). */
  matches: readonly string[];
  /** Shown in the mobile bottom tab bar (Settings is reached via the avatar). */
  inTabBar: boolean;
  /** Single-key shortcut shown as a hint in the sidebar. */
  shortcut: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Today", icon: IconToday, matches: ["/"], inTabBar: true, shortcut: "T" },
  { href: "/habits", label: "Habits", icon: IconList, matches: ["/habits"], inTabBar: true, shortcut: "H" },
  {
    href: "/journal",
    label: "Reflect",
    icon: IconJournal,
    matches: ["/reflect", "/journal", "/review"],
    inTabBar: true,
    shortcut: "R",
  },
  {
    href: "/analytics",
    label: "Insights",
    icon: IconChart,
    matches: ["/insights", "/analytics", "/hall-of-fame"],
    inTabBar: true,
    shortcut: "I",
  },
  { href: "/pet", label: "Pet", icon: IconPet, matches: ["/pet"], inTabBar: true, shortcut: "P" },
  {
    href: "/settings",
    label: "Settings",
    icon: IconSettings,
    // Identity is reached from Settings, so it highlights Settings.
    matches: ["/settings", "/identity"],
    inTabBar: false,
    shortcut: ",",
  },
];

/** Does `pathname` sit inside one of `prefix`'s pages? "/" only matches itself. */
function pathMatches(pathname: string, prefix: string) {
  if (prefix === "/") {
    return pathname === "/";
  }
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** True when the current URL belongs to this nav item's section. */
export function isNavItemActive(item: NavItem, pathname: string) {
  return item.matches.some((prefix) => pathMatches(pathname, prefix));
}

/** The section the user is in (used for the mobile top-bar title). */
export function activeNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => isNavItemActive(item, pathname));
}

/**
 * Keyboard shortcuts (lower-cased key → URL). The section keys mirror the
 * sidebar hints; the extra keys are kept from the old nav so muscle memory
 * still reaches the individual Reflect/Insights pages directly.
 */
export const SHORTCUTS: ReadonlyMap<string, string> = new Map([
  ...NAV_ITEMS.map((item) => [item.shortcut.toLowerCase(), item.href] as const),
  ["n", "/habits/new"],
  ["j", "/journal"],
  ["w", "/review"],
  ["a", "/analytics"],
  ["f", "/hall-of-fame"],
]);

/** First letter of the user's name (or email) for the avatar. */
export function initials(name: string | null, email: string | null) {
  const source = name || email || "A";
  return source.slice(0, 1).toUpperCase();
}
