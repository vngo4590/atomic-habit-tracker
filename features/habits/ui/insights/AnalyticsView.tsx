"use client";

import { useEffect, useMemo, useState } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { PageHeader } from "@/components/ui";
import { todayKey } from "@/lib/helpers";
import { clientLogger } from "@/lib/logger-client";

import {
  AT_RISK_THRESHOLD,
  dailyCompletion,
  rangeKeys,
  rangeTotals,
  totalCheckIns,
  weekdayRates,
  type RangeDays,
} from "./analytics-data";
import styles from "./AnalyticsView.module.css";
import { CompletionTrend } from "./CompletionTrend";
import { HabitBreakdown } from "./HabitBreakdown";
import { KpiGrid } from "./KpiGrid";
import { RangeControl } from "./RangeControl";
import { WeekdayBars } from "./WeekdayBars";

/**
 * AnalyticsView — the /analytics page. Three headline numbers, the daily
 * trend, weekday pattern and per-habit breakdown, all driven by one date
 * range control. Every rate is schedule-aware: a habit only counts on the
 * days it was scheduled.
 */
export function AnalyticsView() {
  const { habits, completionRate, streak, longestStreak } = useStoreContext();
  const [range, setRange] = useState<RangeDays>(30);
  const today = todayKey();

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "analytics" });
  }, []);

  const keys = useMemo(() => rangeKeys(today, range), [today, range]);
  const points = useMemo(() => dailyCompletion(habits, keys), [habits, keys]);
  const weekdays = useMemo(() => weekdayRates(habits, keys), [habits, keys]);

  const rows = useMemo(
    () =>
      habits
        .map((habit) => ({
          habit,
          pct: Math.round(completionRate(habit, range) * 100),
          streak: streak(habit),
          best: longestStreak(habit),
          atRisk: completionRate(habit, 7) < AT_RISK_THRESHOLD,
        }))
        .sort((a, b) => b.pct - a.pct),
    [completionRate, habits, longestStreak, range, streak],
  );

  const totals = rangeTotals(points);
  const best = rows.reduce<(typeof rows)[number] | null>((top, row) => (!top || row.best > top.best ? row : top), null);
  const atRiskCount = rows.filter((row) => row.atRisk).length;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Analytics"
        subtitle="How consistently your habits are showing up."
        actions={<RangeControl value={range} onChange={setRange} />}
      />

      <KpiGrid
        items={[
          {
            label: "Completion rate",
            value: `${totals.pct}%`,
            detail: totals.scheduled
              ? `${totals.done} of ${totals.scheduled} scheduled · ${range} days`
              : `Nothing scheduled · ${range} days`,
          },
          {
            label: "Best streak",
            value: `${best?.best ?? 0} ${best?.best === 1 ? "day" : "days"}`,
            detail: best && best.best > 0 ? best.habit.name : "No streaks yet",
          },
          {
            label: "Total check-ins",
            value: String(totalCheckIns(habits)),
            detail: atRiskCount ? `All time · ${atRiskCount} at risk this week` : "All time",
            testId: "kpi-total-check-ins",
          },
        ]}
      />

      <CompletionTrend points={points} days={range} />

      <div className={styles.split}>
        <WeekdayBars rates={weekdays} days={range} />
        <HabitBreakdown rows={rows} days={range} />
      </div>
    </div>
  );
}
