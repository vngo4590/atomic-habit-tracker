"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  IconBook,
  IconChart,
  IconIdentity,
  IconJournal,
  IconList,
  IconPlus,
  IconSettings,
  IconStar,
  IconToday,
  IconReview,
} from "@/components/Icons";
import { useStoreContext } from "@/components/StoreProvider";
import { logoutAction } from "@/lib/actions/auth";
import { navItemVariants, sidebarStagger } from "@/lib/animations";

const NAV = [
  { href: "/", label: "Today", icon: IconToday, key: "T", group: "Practice" },
  { href: "/habits", label: "All habits", icon: IconList, key: "H", group: "Practice" },
  { href: "/habits/new", label: "New habit", icon: IconPlus, key: "N", group: "Practice" },
  { href: "/analytics", label: "Analytics", icon: IconChart, key: "A", group: "Reflect" },
  { href: "/journal", label: "Journal", icon: IconJournal, key: "J", group: "Reflect" },
  { href: "/review", label: "Weekly review", icon: IconReview, key: "W", group: "Reflect" },
  { href: "/lessons", label: "Daily lessons", icon: IconBook, key: "L", group: "Learn" },
  { href: "/hall-of-fame", label: "Hall of Fame", icon: IconStar, key: "F", group: "Become" },
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

function initials(name: string | null, email: string | null) {
  const source = name || email || "A";
  return source.slice(0, 1).toUpperCase();
}

export function Nav({ user }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { habits } = useStoreContext();
  const totalVotes = habits.reduce((sum, habit) => sum + Object.keys(habit.history).length, 0);
  const groups = NAV.reduce<Record<string, typeof NAV[number][]>>(
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
        router.push(href);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <aside className="sidebar">
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

      {(["Practice", "Reflect", "Learn", "Become"] as const).map((group) => (
        <div key={group}>
          <div className="nav-group">{group}</div>
          <motion.div variants={sidebarStagger} initial="hidden" animate="visible">
            {groups[group]?.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href === "/habits" && pathname.startsWith("/habits/") && pathname !== "/habits/new");

              return (
                <motion.div key={item.href} variants={navItemVariants}>
                  <Link className={`nav-item ${active ? "active" : ""}`} href={item.href}>
                    <Icon className="nav-icon" />
                    <span>{item.label}</span>
                    <span className="ni-key">{item.key}</span>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      ))}

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
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="who-name">{user.name ?? user.email ?? "Atomicly user"}</div>
          <div className="who-id">{totalVotes} votes cast</div>
        </div>
        <form action={logoutAction}>
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
    </aside>
  );
}
