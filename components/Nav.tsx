"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  IconChart,
  IconIdentity,
  IconJournal,
  IconList,
  IconMenu,
  IconPet,
  IconPlus,
  IconSettings,
  IconStar,
  IconToday,
  IconReview,
} from "@/components/Icons";
import { useStoreContext } from "@/components/StoreProvider";
import { logoutAction } from "@/lib/actions/auth";
import { navItemVariants, sidebarStagger } from "@/lib/animations";
import { clientLogger } from "@/lib/logger-client";

import styles from "./Nav.module.css";

const NAV = [
  { href: "/", label: "Today", icon: IconToday, key: "T", group: "Practice" },
  { href: "/habits", label: "All habits", icon: IconList, key: "H", group: "Practice" },
  { href: "/habits/new", label: "New habit", icon: IconPlus, key: "N", group: "Practice" },
  { href: "/analytics", label: "Analytics", icon: IconChart, key: "A", group: "Reflect" },
  { href: "/journal", label: "Journal", icon: IconJournal, key: "J", group: "Reflect" },
  { href: "/review", label: "Weekly review", icon: IconReview, key: "W", group: "Reflect" },
  { href: "/hall-of-fame", label: "Hall of Fame", icon: IconStar, key: "F", group: "Become" },
  { href: "/pet", label: "Pet", icon: IconPet, key: "P", group: "Companion" },
  { href: "/identity", label: "Identity", icon: IconIdentity, key: "I", group: "Become" },
  { href: "/settings", label: "Settings", icon: IconSettings, key: ",", group: "Become" },
] as const;

const SHORTCUTS = new Map(NAV.map((item) => [item.key.toLowerCase(), item.href]));

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

interface NavProps {
  user: {
    name: string | null;
    email: string | null;
  };
}

type NavGroupMap = Record<string, (typeof NAV)[number][]>;

function initials(name: string | null, email: string | null) {
  const source = name || email || "A";
  return source.slice(0, 1).toUpperCase();
}

function NavItemLink({
  item,
  pathname,
  instanceId,
  onClick,
}: {
  item: (typeof NAV)[number];
  pathname: string;
  instanceId: string;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  const active =
    pathname === item.href ||
    (item.href === "/habits" && pathname.startsWith("/habits/") && pathname !== "/habits/new");

  const handleNavigate = () => {
    clientLogger.info("Navigation clicked", {
      event: "nav.navigate",
      href: item.href,
      label: item.label,
      source: "sidebar_link",
    });
    onClick?.();
  };

  return (
    <Link className={`nav-item ${active ? "active" : ""}`} href={item.href} onClick={handleNavigate}>
      {/* Sliding highlight pill — shares a layoutId across this sidebar instance
          so it animates smoothly from the old item to the newly active one.
          The id is namespaced per instance (desktop vs mobile drawer) so the two
          sidebars never try to animate a single pill between each other. */}
      {active && (
        <motion.span
          className="nav-active-pill"
          layoutId={`nav-pill-${instanceId}`}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <Icon className="nav-icon" />
      <span>{item.label}</span>
      <span className="ni-key">{item.key}</span>
    </Link>
  );
}

/**
 * SidebarContent renders the full sidebar UI used on desktop and inside the mobile drawer.
 * It includes the brand mark, grouped navigation links, and the user footer.
 */
function SidebarContent({
  pathname,
  user,
  groups,
  instanceId,
  onNavClick,
}: {
  pathname: string;
  user: NavProps["user"];
  groups: NavGroupMap;
  instanceId: string;
  onNavClick?: () => void;
}) {
  const { habits } = useStoreContext();
  const totalVotes = habits.reduce((sum, habit) => sum + Object.keys(habit.history).length, 0);

  return (
    <>
      <motion.div
        className="brand"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.div
          className="brand-mark"
          whileHover={{ scale: 1.1, rotate: 15 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        />
        <div>
          <div className="brand-name">Atomicly</div>
          <div className="brand-sub">Habit Practice</div>
        </div>
      </motion.div>

      {/* Grouped nav with stagger animations — same layout on desktop and mobile drawer */}
      <div className="desktop-nav">
        {(["Practice", "Reflect", "Companion", "Become"] as const).map((group) => (
          <div key={group}>
            <div className="nav-group">{group}</div>
            <motion.div variants={sidebarStagger} initial="hidden" animate="visible">
              {groups[group]?.map((item) => (
                <motion.div key={item.href} variants={navItemVariants}>
                  <NavItemLink item={item} pathname={pathname} instanceId={instanceId} onClick={onNavClick} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        ))}
      </div>

      <motion.div
        className="sidebar-foot"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <motion.div
          className="avatar"
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          {initials(user.name, user.email)}
        </motion.div>
        <div className={styles.userText}>
          <div className="who-name">{user.name ?? user.email ?? "Atomicly user"}</div>
          <div className="who-id">{totalVotes} votes cast</div>
        </div>
        <form
          action={logoutAction}
          onSubmit={() => {
            clientLogger.info("Logout submitted", {
              event: "nav.logout",
              source: "sidebar",
            });
          }}
        >
          <motion.button
            className="btn btn-sm"
            type="submit"
            title="Sign out"
            whileTap={{ scale: 0.95 }}
          >
            Out
          </motion.button>
        </form>
      </motion.div>
    </>
  );
}

export function Nav({ user }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const groups = NAV.reduce<NavGroupMap>
    (
      (acc, item) => {
        acc[item.group] = [...(acc[item.group] ?? []), item];
        return acc;
      },
      {}
    );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const href = SHORTCUTS.get(event.key.toLowerCase());
      if (href) {
        event.preventDefault();
        clientLogger.info("Navigation shortcut used", {
          event: "nav.shortcut",
          href,
          key: event.key.toLowerCase(),
        });
        router.push(href);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <>
      {/* Desktop sidebar — always visible on large screens, hidden on mobile via CSS */}
      <aside className="sidebar" aria-label="Main navigation">
        <SidebarContent pathname={pathname} user={user} groups={groups} instanceId="desktop" />
      </aside>

      {/* Mobile hamburger button — fixed to the top-left, visible only on small screens */}
      <button
        className="mobile-menu-btn"
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={drawerOpen}
        aria-controls="mobile-nav-drawer"
        onClick={() => setDrawerOpen(true)}
      >
        <IconMenu size={20} />
      </button>

      {/* Mobile drawer — slides in from the left with a backdrop overlay */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className="mobile-drawer-overlay"
            role="dialog"
            aria-modal="true"
            id="mobile-nav-drawer"
            aria-label="Navigation drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDrawerOpen(false)}
          >
            <motion.aside
              className="sidebar mobile-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              aria-label="Main navigation"
            >
              <SidebarContent
                pathname={pathname}
                user={user}
                groups={groups}
                instanceId="mobile"
                onNavClick={() => setDrawerOpen(false)}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
