"use client";

import { useMemo, useState } from "react";

import { LineChart } from "@/components/LineChart";
import { useStoreContext } from "@/components/StoreProvider";
import { dateAdd, fmt, todayKey } from "@/lib/helpers";

const RANGES = [14, 30, 90] as const;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export default function AnalyticsPage() {
  const { habits, completionRate, longestStreak } = useStoreContext();
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const today = todayKey();

  const chartData = useMemo(() => {
    return Array.from({ length: range }, (_, index) => {
      const key = dateAdd(today, index - range + 1);
      const done = habits.filter((habit) => habit.history[key]).length;
      return {
        label: fmt.short(key),
        pct: habits.length ? Math.round((done / habits.length) * 100) : 0,
      };
    });
  }, [habits, range, today]);

  const stats = useMemo(() => {
    const average = habits.length
      ? Math.round((habits.reduce((sum, habit) => sum + completionRate(habit), 0) / habits.length) * 100)
      : 0;
    const total = habits.reduce((sum, habit) => sum + Object.keys(habit.history).filter((key) => Boolean(habit.history[key])).length, 0);
    const best = [...habits].sort((a, b) => longestStreak(b) - longestStreak(a))[0];
    const atRisk = habits.filter((habit) => completionRate(habit, 7) < 0.5).length;
    return { average, total, best, atRisk };
  }, [completionRate, habits, longestStreak]);

  const weekdayRates = useMemo(() => {
    return WEEKDAYS.map((label, weekday) => {
      let total = 0;
      let done = 0;
      for (let i = 0; i < 90; i++) {
        const key = dateAdd(today, -i);
        if (new Date(`${key}T00:00:00`).getDay() === weekday) {
          total += habits.length;
          done += habits.filter((habit) => habit.history[key]).length;
        }
      }
      return { label, pct: total ? Math.round((done / total) * 100) : 0 };
    });
  }, [habits, today]);

  const leaderboard = useMemo(() => {
    return [...habits]
      .map((habit) => ({ habit, pct: Math.round(completionRate(habit, 30) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [completionRate, habits]);

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="eyebrow">Reflect</div>
          <h1 className="h1">Habit <em>analytics</em></h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
        {[
          ["Average adherence", `${stats.average}%`, "Last 30 days"],
          ["Total check-ins", String(stats.total), "All time"],
          ["Best streak ever", `${stats.best ? longestStreak(stats.best) : 0} days`, stats.best?.name ?? "-"],
          ["Habits at risk", String(stats.atRisk), "Below 50% this week"],
        ].map(([label, value, sub]) => (
          <div key={label} className="card card-pad">
            <div className="eyebrow">{label}</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 32, marginTop: 6 }}>{value}</div>
            <div className="muted" style={{ fontSize: 12 }}>{sub}</div>
          </div>
        ))}
      </div>

      <section className="card card-pad" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 className="h3">Daily completion</h2>
          <div className="tabs" style={{ borderBottom: "none", margin: 0 }}>
            {RANGES.map((days) => (
              <button key={days} className={`tab ${range === days ? "active" : ""}`} onClick={() => setRange(days)}>
                {days} days
              </button>
            ))}
          </div>
        </div>
        <LineChart data={chartData} />
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 18 }}>
        <section className="card card-pad">
          <div className="eyebrow">By weekday</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, height: 180, alignItems: "end", marginTop: 18 }}>
            {weekdayRates.map((day) => (
              <div key={day.label} style={{ display: "grid", gap: 8, alignContent: "end", height: "100%" }}>
                <div style={{ height: `${Math.max(5, day.pct)}%`, background: "var(--accent)", borderRadius: 4 }} />
                <div className="mono muted" style={{ textAlign: "center", fontSize: 10 }}>{day.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card card-pad">
          <div className="eyebrow">Leaderboard</div>
          <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
            {leaderboard.map(({ habit, pct }, index) => (
              <div key={habit.id} style={{ display: "grid", gridTemplateColumns: "34px 1fr 48px", gap: 12, alignItems: "center" }}>
                <div className="mono muted">{String(index + 1).padStart(2, "0")}</div>
                <div>
                  <div className="habit-name">{habit.name}</div>
                  <div style={{ height: 5, background: "var(--bg-sunk)", borderRadius: 99, overflow: "hidden", marginTop: 7 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }} />
                  </div>
                </div>
                <div className="mono" style={{ textAlign: "right", fontSize: 12 }}>{pct}%</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
