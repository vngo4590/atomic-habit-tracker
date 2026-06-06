"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerContainer";
import { LineChart } from "@/components/LineChart";
import { useStoreContext } from "@/components/StoreProvider";
import { TabUnderline } from "@/components/TabUnderline";
import { dateAdd, fmt, todayKey } from "@/lib/helpers";
import { clientLogger } from "@/lib/logger-client";
import { isScheduledForDate } from "@/lib/schedule";

import styles from "./page.module.css";

const RANGES = [14, 30, 90] as const;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * Analytics — overview of habit progress with four stat cards, a daily
 * completion line chart, weekday adherence bars, and a leaderboard.
 *
 * All percentages are schedule-aware: only days where a habit was
 * actually scheduled count toward its completion rate. See
 * `isScheduledForDate` and the chart/weekday memos.
 */
export default function AnalyticsPage() {
  const { habits, completionRate, longestStreak } = useStoreContext();
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const today = todayKey();

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "analytics" });
  }, []);

  // Build the daily-completion chart data — one point per day in the
  // selected range. Each point is the % of scheduled habits completed
  // that day; unscheduled habits don't drag the average down.
  const chartData = useMemo(() => {
    return Array.from({ length: range }, (_, index) => {
      const key = dateAdd(today, index - range + 1);
      const scheduled = habits.filter((habit) => isScheduledForDate(key, habit.schedule));
      const done = scheduled.filter((habit) => habit.history[key]).length;
      return {
        label: fmt.short(key),
        pct: scheduled.length ? Math.round((done / scheduled.length) * 100) : 0,
      };
    });
  }, [habits, range, today]);

  // Compute the four top stats (average adherence, total check-ins,
  // best streak, at-risk count).
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

  // Walk the last 90 days and bucket scheduled/done counts per weekday.
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

  // 30-day leaderboard sorted descending by completion rate.
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
        className={styles.statsGrid}
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
            <div className={styles.statValue}>{value}</div>
            <div className={`muted ${styles.statSub}`}>{sub}</div>
          </motion.div>
        ))}
      </motion.div>

      <motion.section
        className={`card card-pad ${styles.section}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className={styles.sectionHeader}>
          <h2 className="h3">Daily completion</h2>
          <div className={`tabs ${styles.tabsInline}`}>
            {RANGES.map((days) => (
              <motion.button
                key={days}
                className={`tab ${range === days ? "active" : ""}`}
                onClick={() => setRange(days)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                {days} days
                {range === days && <TabUnderline groupId="analytics-range" />}
              </motion.button>
            ))}
          </div>
        </div>
        <LineChart data={chartData} />
      </motion.section>

      <motion.div
        className={styles.bottomGrid}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
      >
        <section className="card card-pad">
          <div className="eyebrow">By weekday</div>
          {hasWeekdayData ? (
            <StaggerContainer staggerDelay={0.05} className={styles.weekdayList}>
              {weekdayRates.map((day) => (
                <StaggerItem key={day.label}>
                  <div className={styles.weekdayRow}>
                    <div className={`mono muted ${styles.captionMono}`}>{day.label}</div>
                    <div className={styles.barTrack}>
                      <motion.div
                        aria-label={`${day.label} completion ${day.pct}%`}
                        className={styles.barFill}
                        // minWidth ensures a tiny sliver renders for >0% bars.
                        style={{ minWidth: day.pct > 0 ? 6 : 0 }}
                        initial={{ width: 0 }}
                        animate={{ width: `${day.pct}%` }}
                        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                      />
                    </div>
                    <div className={`mono ${styles.percentRight}`}>{day.pct}%</div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <div className={`empty-state ${styles.emptySpacer}`}>
              <div className="empty-title">No weekday data yet</div>
              <p className={`muted ${styles.emptyBody}`}>
                Check in a habit to see completion patterns by day.
              </p>
            </div>
          )}
        </section>

        <section className="card card-pad">
          <div className="eyebrow">Leaderboard</div>
          <StaggerContainer staggerDelay={0.04} className={styles.leaderboardList}>
            {leaderboard.map(({ habit, pct }, index) => (
              <StaggerItem key={habit.id}>
                <div className={styles.leaderboardRow}>
                  <div className="mono muted">{String(index + 1).padStart(2, "0")}</div>
                  <div>
                    <div className="habit-name">{habit.name}</div>
                    <div className={styles.leaderboardTrack}>
                      <motion.div
                        className={styles.barFill}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: index * 0.04, ease: [0.4, 0, 0.2, 1] }}
                      />
                    </div>
                  </div>
                  <div className={`mono ${styles.percentRight}`}>{pct}%</div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      </motion.div>
    </motion.div>
  );
}
