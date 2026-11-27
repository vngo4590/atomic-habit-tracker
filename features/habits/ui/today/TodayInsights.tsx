"use client";

import { m, useReducedMotion } from "framer-motion";

import { Card } from "@/components/ui";
import { fmt } from "@/lib/helpers";
import type { Habit } from "@/lib/types";

import type { DayTally } from "./today-model";
import styles from "./TodayInsights.module.css";

export interface TodayInsightsProps {
  longest: number;
  topHabit: Habit | null;
  last14: DayTally[];
}

/** Colour band for a sparkline bar: today is accented, others by fullness. */
function barLevel(day: DayTally, isToday: boolean): "today" | "high" | "low" {
  if (isToday) return "today";
  return day.total && day.done / day.total > 0.5 ? "high" : "low";
}

/**
 * TodayInsights — the quiet secondary row under the focus list: the longest
 * active streak and a 14-day completion sparkline. Informational only, so
 * it uses muted type and no interactive controls.
 */
export function TodayInsights({ longest, topHabit, last14 }: TodayInsightsProps) {
  const reduceMotion = useReducedMotion();
  const fullDays = last14.filter((day) => day.total > 0 && day.done >= day.total).length;

  return (
    <div className={styles.grid}>
      <Card className={styles.tile}>
        <p className={styles.label}>Longest active streak</p>
        <p className={styles.value}>
          {longest}
          <span className={styles.unit}> days</span>
        </p>
        <p className={styles.caption}>{topHabit && longest > 0 ? `${topHabit.name} - keep it warm.` : "Check in today to start one."}</p>
      </Card>

      <Card className={styles.tile}>
        <p className={styles.label}>Last 14 days</p>
        <div
          className={styles.spark}
          role="img"
          aria-label={`Every habit done on ${fullDays} of the last ${last14.length} days`}
        >
          {last14.map((day, index) => {
            const pct = day.total ? (day.done / day.total) * 100 : 0;
            const isToday = index === last14.length - 1;
            return (
              <m.span data-motion-fallback
                key={day.key}
                className={styles.bar}
                data-level={barLevel(day, isToday)}
                title={`${fmt.short(day.key)}: ${day.done}/${day.total}`}
                // Bar height is data, passed as a CSS variable so the class
                // stays generic (inline-style policy: dynamic passthrough).
                style={{ ["--bar-h" as string]: `${Math.max(6, pct)}%` }}
                initial={reduceMotion ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.32, delay: reduceMotion ? 0 : index * 0.02, ease: [0.4, 0, 0.2, 1] }}
              />
            );
          })}
        </div>
        <div className={styles.axis} aria-hidden="true">
          <span>2 weeks ago</span>
          <span>Today</span>
        </div>
      </Card>
    </div>
  );
}
