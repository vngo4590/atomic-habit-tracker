"use client";

import { useId } from "react";

import { Card } from "@/components/ui";
import { fmt } from "@/lib/helpers";
import type { Habit } from "@/lib/types";

import styles from "./WeekSnapshot.module.css";
import { isDone as isDayDone } from "@/features/habits";

interface WeekSnapshotProps {
  /** The seven date keys being reviewed, oldest first. */
  days: string[];
  habits: Habit[];
  completionRate: (habit: Habit, days?: number) => number;
}

/** Percent of habits checked in on `day` (0 when there are no habits). */
function dayPercent(habits: Habit[], day: string) {
  if (!habits.length) return 0;
  return Math.round((habits.filter((habit) => isDayDone(habit.history[day])).length / habits.length) * 100);
}

/**
 * WeekSnapshot — the context to reflect on: last-7-day check-in totals, a
 * per-day bar strip (each bar labelled with its %, so colour is never the
 * only signal) and the habits that went well or need attention.
 */
export function WeekSnapshot({ days, habits, completionRate }: WeekSnapshotProps) {
  const headingId = useId();
  const possible = days.length * habits.length;
  const done = days.reduce((sum, day) => sum + habits.filter((habit) => isDayDone(habit.history[day])).length, 0);
  const pct = possible ? Math.round((done / possible) * 100) : 0;
  const wins = habits.filter((habit) => completionRate(habit, 7) >= 0.85);
  const slips = habits.filter((habit) => completionRate(habit, 7) < 0.5);

  return (
    <Card as="section" aria-labelledby={headingId} className={styles.card}>
      <div className={styles.header}>
        <h2 id={headingId} className={styles.title}>
          Last 7 days
        </h2>
        <p className={styles.totals}>
          {done} / {possible} check-ins · {pct}%
        </p>
      </div>

      <ol className={styles.days} aria-label="Daily completion">
        {days.map((day) => {
          const value = dayPercent(habits, day);
          return (
            <li key={day} className={styles.day} aria-label={`${fmt.weekday(day)} ${day.slice(-2)}: ${value}%`}>
              <span className={styles.value} aria-hidden="true">
                {value}%
              </span>
              <span className={styles.track} aria-hidden="true">
                {/* Bar height is per-day data, passed as a CSS variable. */}
                <span className={styles.fill} style={{ ["--pct" as string]: `${Math.max(4, value)}%` }} />
              </span>
              <span className={styles.label} aria-hidden="true">
                {fmt.weekday(day)}
                <span className={styles.date}>{day.slice(-2)}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className={styles.lists}>
        <HabitList title="Going well" empty="No habit was 85%+ this week" habits={wins} rate={completionRate} />
        <HabitList title="Needs attention" empty="No habit fell below 50% this week" habits={slips} rate={completionRate} />
      </div>
    </Card>
  );
}

function HabitList({
  title,
  empty,
  habits,
  rate,
}: {
  title: string;
  empty: string;
  habits: Habit[];
  rate: WeekSnapshotProps["completionRate"];
}) {
  return (
    <div>
      <h3 className={styles.listTitle}>{title}</h3>
      {habits.length ? (
        <ul className={styles.list} role="list">
          {habits.map((habit) => (
            <li key={habit.id} className={styles.listItem}>
              <span className={styles.habitName}>{habit.name}</span>
              <span className={styles.habitRate}>{Math.round(rate(habit, 7) * 100)}% this week</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{empty}</p>
      )}
    </div>
  );
}
