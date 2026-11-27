"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { IconButton } from "@/components/ui";

import { activeNavItem, initials, type NavItem } from "./nav-items";
import type { NavUser } from "./Sidebar";
import styles from "./MobileNav.module.css";

/**
 * MobileTopBar — the fixed header below 1024px: current section title on
 * the left, "New habit" and an avatar that opens Settings on the right.
 *
 * Marked `data-top-obstruction` so floating UI (HelpTip popovers) knows to
 * keep clear of it.
 */
export function MobileTopBar({ pathname, user }: { pathname: string; user: NavUser }) {
  const section = activeNavItem(pathname);
  const onSettings = section?.href === "/settings";
  return (
    <header className={styles.topBar} data-top-obstruction="">
      <span className={styles.title}>{section?.label ?? "Atomicly"}</span>
      <div className={styles.topActions}>
        <IconButton href="/habits/new" aria-label="New habit" icon={<Plus size={22} />} />
        <Link
          href="/settings"
          className={styles.avatarLink}
          aria-label="Settings"
          aria-current={onSettings ? "page" : undefined}
        >
          <span className={styles.avatar} aria-hidden="true">
            {initials(user.name, user.email)}
          </span>
        </Link>
      </div>
    </header>
  );
}

/**
 * BottomTabBar — fixed tab bar below 1024px with the five primary
 * destinations (Settings lives behind the top-bar avatar). Each tab is a
 * ≥44px target, the active one carries `aria-current="page"` plus a filled
 * pill + bolder label (not colour alone), and the bar pads itself above the
 * iOS home indicator via the safe-area inset.
 */
export function BottomTabBar({ items, isActive }: { items: readonly NavItem[]; isActive: (item: NavItem) => boolean }) {
  return (
    <nav className={styles.tabBar} aria-label="Primary" data-bottom-obstruction="">
      <ul className={styles.tabList}>
        {items.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <li key={item.href} className={styles.tabItem}>
              <Link href={item.href} className={styles.tab} aria-current={active ? "page" : undefined}>
                <span className={styles.tabIcon} aria-hidden="true">
                  <Icon size={22} />
                </span>
                <span className={styles.tabLabel}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
