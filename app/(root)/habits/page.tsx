"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { IconPlus } from "@/components/Icons";
import { useStoreContext } from "@/components/StoreProvider";

type Filter = "all" | "morning" | "afternoon" | "evening";
type Sort = "streak" | "rate" | "newest" | "name";

const FILTERS: Filter[] = ["all", "morning", "afternoon", "evening"];

export default function HabitsPage() {
  const router = useRouter();
  const { habits, streak, longestStreak, completionRate } = useStoreContext();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("streak");

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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div className="tabs" style={{ borderBottom: "none", margin: 0 }}>
          {FILTERS.map((item) => (
            <button key={item} className={`tab ${filter === item ? "active" : ""}`} onClick={() => setFilter(item)}>
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <select className="input" style={{ width: "auto", height: 32, padding: "0 28px 0 12px", fontSize: 12.5 }} value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
          <option value="streak">Sort: Active streak</option>
          <option value="rate">Sort: 30-day rate</option>
          <option value="newest">Sort: Newest</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      <div className="card">
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 90px 90px 100px", padding: "12px 22px", borderBottom: "1px solid var(--rule)", background: "var(--bg-sunk)" }}>
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
              className="click-row"
              style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 90px 90px 100px", padding: "18px 22px", borderBottom: "1px solid var(--rule)", alignItems: "center" }}
              onClick={() => router.push(`/habits/${habit.id}`)}
            >
              <div>
                <div className="habit-name">{habit.name}</div>
                <div className="muted mono" style={{ fontSize: 10.5, marginTop: 3, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {habit.identity} · {habit.schedule}
                </div>
              </div>
              <div className="muted" style={{ fontSize: 12, fontStyle: "italic", fontFamily: "var(--serif)", lineHeight: 1.35 }}>
                &quot;{habit.cue.slice(0, 38)}{habit.cue.length > 38 ? "..." : ""}&quot;
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{activeStreak}d</div>
              <div className="mono muted" style={{ fontSize: 13 }}>{best}d</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 4, background: "var(--bg-sunk)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${rate}%`, height: "100%", background: "var(--accent)" }} />
                </div>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", minWidth: 24, textAlign: "right" }}>{rate}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
