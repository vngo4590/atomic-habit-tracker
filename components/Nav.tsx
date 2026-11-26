"use client";

import { usePathname } from "next/navigation";

import { BottomTabBar, MobileTopBar } from "@/components/nav/MobileNav";
import { NAV_ITEMS, isNavItemActive } from "@/components/nav/nav-items";
import { Sidebar, type NavUser } from "@/components/nav/Sidebar";
import { useNavShortcuts } from "@/components/nav/useNavShortcuts";

const TAB_BAR_ITEMS = NAV_ITEMS.filter((item) => item.inTabBar);

/**
 * Nav — the authenticated app's navigation shell (ADR-0003 IA):
 *   • ≥1024px: a 240px left Sidebar (brand, "New habit", six destinations,
 *     user footer with sign out).
 *   • <1024px: a fixed MobileTopBar (section title, New habit, avatar →
 *     Settings) and a fixed BottomTabBar (Today, Habits, Reflect, Insights,
 *     Pet).
 * All three render together; CSS decides which are visible, so there is no
 * hydration flash or JS breakpoint logic. Also installs the single-key
 * navigation shortcuts.
 */
export function Nav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  useNavShortcuts();

  return (
    <>
      <Sidebar pathname={pathname} user={user} />
      <MobileTopBar pathname={pathname} user={user} />
      <BottomTabBar items={TAB_BAR_ITEMS} isActive={(item) => isNavItemActive(item, pathname)} />
    </>
  );
}
