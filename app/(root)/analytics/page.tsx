"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerContainer";
import { LineChart } from "@/components/LineChart";
import { useStoreContext } from "@/components/StoreProvider";
import { dateAdd, fmt, todayKey } from "@/lib/helpers";
import { isScheduledForDate } from "@/lib/schedule";

const RANGES = [14, 30, 90] as const;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export default function AnalyticsPage() {
  const { habits, completionRate, longestStreak } = useStoreContext();
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const today = todayKey();

  const chartData = useMemo(() => {
    return Array.from({ length: range }, (_, index) => {
      const key = dateAdd(today, index - range + 1);
      // Only count habits that were actually scheduled for this day.
      const scheduled = habits.filter((habit) => isScheduledForDate(key, habit.schedule));
      const done = scheduled.filter((habit) => habit.history[key]).length;
      return {
        label: fmt.short(key),
        pct: scheduled.length ? Math.round((done / scheduled.length) * 100) : 0,
      };
    });
  }, [habits, range, today]);

  const stats = useMemo(() => {
    const average = habits.length
      ? Math.round((habits.reduce((sum, habit) => sum + completionRate(habit), 0) / habits.length) * 100)
      : 0;
    const total = habits.reduce(
      (sum, habit) => sum + Object.keys(habit.history).filter((key) => Boolean(habit.history[key])).length,
      0
    );
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
          habits.forEach((habit) => {
            if (isScheduledForDate(key, habit.schedule)) {
              total++;
              if (habit.history[key]) done++;
            }
          });
        }
      }
      return { label, pct: total ? Math.round((done / total) * 100) : 0, total };
    });
  }, [habits, today]);
  const hasWeekdayData = weekdayRates.some((day) => day.total > 0);

  const leaderboard = useMemo(() => {
    return [...habits]
      .map((habit) => ({ habit, pct: Math.round(completionRate(habit, 30) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [completionRate, habits]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="page-header">
        <div>
          <div className="eyebrow">Reflect</div>
          <h1 className="h1">
            Habit <em>analytics</em>
          </h1>
        </div>
      </div>

      <motion.div
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
      >
        {[
          ["Average adherence", `${stats.average}%`, "Last 30 days"],
          ["Total check-ins", String(stats.total), "All time"],
          ["Best streak ever", `${stats.best ? longestStreak(stats.best) : 0} days`, stats.best?.name ?? "-"],
          ["Habits at risk", String(stats.atRisk), "Below 50% this week"],
        ].map(([label, value, sub]) => (
          <motion.div
            key={label}
            className="card card-pad"
            whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="eyebrow">{label}</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 32, marginTop: 6 }}>{value}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {sub}
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.section
        className="card card-pad"
        style={{ marginBottom: 18 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 className="h3">Daily completion</h2>
          <div className="tabs" style={{ borderBottom: "none", margin: 0 }}>
            {RANGES.map((days) => (
              <motion.button
                key={days}
                className={`tab ${range === days ? "active" : ""}`}
                onClick={() => setRange(days)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                {days} days
              </motion.button>
            ))}
          </div>
        </div>
        <LineChart data={chartData} />
      </motion.section>

      <motion.div
        style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 18 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
      >
        <section className="card card-pad">
          <div className="eyebrow">By weekday</div>
          {hasWeekdayData ? (
            <StaggerContainer staggerDelay={0.05} style={{ display: "grid", gap: 12, marginTop: 18 }}>
              {weekdayRates.map((day) => (
                <StaggerItem key={day.label}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "42px 1fr 44px",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div className="mono muted" style={{ fontSize: 11 }}>
                      {day.label}
                    </div>
                    <div style={{ height: 10, background: "var(--bg-sunk)", borderRadius: 99, overflow: "hidden" }}>
                      <motion.div
                        aria-label={`${day.label} completion ${day.pct}%`}
                        style={{
                          minWidth: day.pct > 0 ? 6 : 0,
                          height: "100%",
                          background: "var(--accent)",
                          borderRadius: 99,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${day.pct}%` }}
                        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                      />
                    </div>
                    <div className="mono" style={{ textAlign: "right", fontSize: 11 }}>
                      {day.pct}%
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <div className="empty-state" style={{ marginTop: 18 }}>
              <div className="empty-title">No weekday data yet</div>
              <p className="muted" style={{ margin: "6px 0 0" }}>
                Check in a habit to see completion patterns by day.
              </p>
            </div>
          )}
        </section>

        <section className="card card-pad">
          <div className="eyebrow">Leaderboard</div>
          <StaggerContainer staggerDelay={0.04} style={{ display: "grid", gap: 14, marginTop: 16 }}>
            {leaderboard.map(({ habit, pct }, index) => (
              <StaggerItem key={habit.id}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "34px 1fr 48px",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div className="mono muted">{String(index + 1).padStart(2, "0")}</div>
                  <div>
                    <div className="habit-name">{habit.name}</div>
                    <div
                      style={{
                        height: 5,
                        background: "var(--bg-sunk)",
                        borderRadius: 99,
                        overflow: "hidden",
                        marginTop: 7,
                      }}
                    >
                      <motion.div
                        style={{ height: "100%", background: "var(--accent)" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: index * 0.04, ease: [0.4, 0, 0.2, 1] }}
                      />
                    </div>
                  </div>
                  <div className="mono" style={{ textAlign: "right", fontSize: 12 }}>
                    {pct}%
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      </motion.div>
    </motion.div>
  );
}
