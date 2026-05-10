"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { IconArrow, IconBack, IconPlus } from "@/components/Icons";
import { useStoreContext } from "@/components/StoreProvider";
import { formatScheduleLabel } from "@/lib/schedule";

type Filter = "all" | "morning" | "afternoon" | "evening";
type Sort = "streak" | "rate" | "newest" | "name";

const FILTERS: Filter[] = ["all", "morning", "afternoon", "evening"];

export default function HabitsPage() {
  const router = useRouter();
  const { habits, streak, longestStreak, completionRate } = useStoreContext();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("streak");
  const filterListRef = useRef<HTMLDivElement>(null);

  const scrollFilters = (direction: -1 | 1) => {
    filterListRef.current?.scrollBy({ left: direction * 140, behavior: "smooth" });
  };

  const filtered = useMemo(() => {
    const list = habits.filter((habit) => filter === "all" || habit.time.toLowerCase() === filter);
    return [...list].sort((a, b) => {
      if (sort === "streak") {
        return streak(b) - streak(a);
      }
      if (sort === "rate") {
        return completionRate(b) - completionRate(a);
      }
      if (sort === "newest") {
        return b.createdAt.localeCompare(a.createdAt);
      }
      return a.name.localeCompare(b.name);
    });
  }, [completionRate, filter, habits, sort, streak]);

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="eyebrow">Library</div>
          <h1 className="h1">All <em>habits</em></h1>
        </div>
        <button className="btn btn-primary" onClick={() => router.push("/habits/new")}>
          <IconPlus style={{ width: 13, height: 13 }} /> New habit
        </button>
      </div>

      <div className="habit-library-toolbar">
        <div className="habit-filter-shell">
          <button className="habit-filter-arrow" type="button" aria-label="Scroll filters left" onClick={() => scrollFilters(-1)}>
            <IconBack />
          </button>
          <div className="tabs habit-library-tabs" ref={filterListRef}>
            {FILTERS.map((item) => (
              <button key={item} className={`tab ${filter === item ? "active" : ""}`} onClick={() => setFilter(item)}>
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
          <button className="habit-filter-arrow" type="button" aria-label="Scroll filters right" onClick={() => scrollFilters(1)}>
            <IconArrow />
          </button>
        </div>
        <div className="habit-sort-row">
          <span className="field-label">Sort</span>
          <select className="input habit-sort-select" value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
            <option value="streak">Active streak</option>
            <option value="rate">30-day rate</option>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <div className="habit-list">
        <div className="habit-list-header">
          {["Habit", "Cue -> response", "Streak", "Best", "30-day"].map((heading) => (
            <div key={heading} className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>{heading}</div>
          ))}
        </div>
        {filtered.map((habit) => {
          const activeStreak = streak(habit);
          const best = longestStreak(habit);
          const rate = Math.round(completionRate(habit) * 100);
          return (
            <div
              key={habit.id}
              className="click-row habit-list-row"
              onClick={() => router.push(`/habits/${habit.id}`)}
            >
              <div className="habit-list-field">
                <div className="habit-list-label">Habit</div>
                <div style={{ minWidth: 0 }}>
                  <div className="habit-name">{habit.name}</div>
                  <div className="muted mono" style={{ fontSize: 10.5, marginTop: 3, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    {habit.identity} · {formatScheduleLabel(habit.schedule)}
                  </div>
                </div>
              </div>
              <div className="habit-list-field">
                <div className="habit-list-label">Cue</div>
                <div className="muted" style={{ fontSize: 12, fontStyle: "italic", fontFamily: "var(--serif)", lineHeight: 1.35 }}>
                  &quot;{habit.cue.slice(0, 38)}{habit.cue.length > 38 ? "..." : ""}&quot;
                </div>
              </div>
              <div className="mono habit-list-field" style={{ fontSize: 13, fontWeight: 500 }}>
                <div className="habit-list-label">Streak</div>
                {activeStreak}d
              </div>
              <div className="mono muted habit-list-field" style={{ fontSize: 13 }}>
                <div className="habit-list-label">Best</div>
                {best}d
              </div>
              <div className="habit-list-field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="habit-list-label">30-day</div>
                <div className="habit-list-progress">
                  <div style={{ flex: 1, height: 4, background: "var(--bg-sunk)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${rate}%`, height: "100%", background: "var(--accent)" }} />
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", minWidth: 24, textAlign: "right" }}>{rate}%</span>
                </div>
              </div>
            </div>
          );
        })}
        {habits.length === 0 && (
          <div style={{ padding: "42px 22px", textAlign: "center" }}>
            <div className="eyebrow">Empty library</div>
            <h2 className="h2" style={{ marginTop: 8 }}>No habits in your account yet.</h2>
            <p className="muted" style={{ margin: "10px auto 18px", maxWidth: 420, lineHeight: 1.5 }}>
              Create one habit to begin casting identity votes.
            </p>
            <button className="btn btn-primary" onClick={() => router.push("/habits/new")}>
              <IconPlus style={{ width: 13, height: 13 }} /> New habit
            </button>
          </div>
        )}
        {habits.length > 0 && filtered.length === 0 && (
          <div className="muted" style={{ padding: "28px 22px", textAlign: "center" }}>
            No habits match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
