"use client";

import Link from "next/link";
import { LogOut, Plus } from "lucide-react";

import { useStoreContext } from "@/components/StoreProvider";
import { Button, IconButton } from "@/components/ui";
import { logoutAction } from "@/lib/actions/auth";
import { clientLogger } from "@/lib/logger-client";

import { NAV_ITEMS, initials, isNavItemActive } from "./nav-items";
import styles from "./Sidebar.module.css";

export interface NavUser {
  name: string | null;
  email: string | null;
}

/**
 * Sidebar — the desktop (≥1024px) navigation rail, 240px wide.
 *
 * Top: brand + the one primary action ("New habit"). Middle: the six
 * destinations with `aria-current="page"` on the active one. Bottom: who is
 * signed in, how many votes they've cast, and a sign-out button. Hidden below
 * 1024px, where MobileTopBar + BottomTabBar take over.
 */
export function Sidebar({ pathname, user }: { pathname: string; user: NavUser }) {
  const { habits } = useStoreContext();
  // Every completed day across all habits is a "vote" for the user's identity.
  const totalVotes = habits.reduce((sum, habit) => sum + Object.keys(habit.history).length, 0);

  return (
    <aside className={styles.sidebar} aria-label="Sidebar">
      <Link href="/" className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true" />
        <span className={styles.brandName}>Atomicly</span>
      </Link>

      <Button href="/habits/new" icon={<Plus size={16} />} fullWidth>
        New habit
      </Button>

      <nav aria-label="Main navigation" className={styles.nav}>
        <ul className={styles.list}>
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(item, pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={styles.item}
                  aria-current={active ? "page" : undefined}
                  aria-keyshortcuts={`Alt+Shift+${item.shortcut}`}
                  title={`${item.label} (Alt+Shift+${item.shortcut})`}
                  onClick={() =>
                    clientLogger.info("Navigation clicked", {
                      event: "nav.navigate",
                      href: item.href,
                      label: item.label,
                      source: "sidebar_link",
                    })
                  }
                >
                  <Icon size={18} aria-hidden="true" className={styles.icon} />
                  <span>{item.label}</span>
                  <kbd className={styles.key} aria-hidden="true">
                    {item.shortcut}
                  </kbd>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.foot}>
        <span className={styles.avatar} aria-hidden="true" data-testid="nav-avatar">
          {initials(user.name, user.email)}
        </span>
        <div className={styles.who}>
          <div className={styles.whoName}>{user.name ?? user.email ?? "Atomicly user"}</div>
          <div className={styles.whoMeta}>{totalVotes} votes cast</div>
        </div>
        <form
          action={logoutAction}
          onSubmit={() => clientLogger.info("Logout submitted", { event: "nav.logout", source: "sidebar" })}
        >
          <IconButton type="submit" aria-label="Sign out" icon={<LogOut size={18} />} />
        </form>
      </div>
    </aside>
  );
}
