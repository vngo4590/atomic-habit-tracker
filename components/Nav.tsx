"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { logoutAction } from "@/lib/actions/auth";
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
  const groups = NAV.reduce<Record<string, typeof NAV[number][]>>((acc, item) => {
    acc[item.group] = [...(acc[item.group] ?? []), item];
    return acc;
  }, {});

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
      <div className="brand">
        <div className="brand-mark" />
        <div>
          <div className="brand-name">Atomicly</div>
          <div className="brand-sub">Habit Practice</div>
        </div>
      </div>

      {(["Practice", "Reflect", "Learn", "Become"] as const).map((group) => (
        <div key={group}>
          <div className="nav-group">{group}</div>
          {groups[group]?.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href === "/habits" && pathname.startsWith("/habits/") && pathname !== "/habits/new");

            return (
              <Link key={item.href} className={`nav-item ${active ? "active" : ""}`} href={item.href}>
                <Icon className="nav-icon" />
                <span>{item.label}</span>
                <span className="ni-key">{item.key}</span>
              </Link>
            );
          })}
        </div>
      ))}

      <div className="sidebar-foot">
        <div className="avatar">{initials(user.name, user.email)}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="who-name">{user.name ?? user.email ?? "Atomicly user"}</div>
          <div className="who-id">{totalVotes} votes cast</div>
        </div>
        <form action={logoutAction}>
          <button className="btn btn-sm" type="submit" title="Sign out">
            Out
          </button>
        </form>
      </div>
    </aside>
  );
}
