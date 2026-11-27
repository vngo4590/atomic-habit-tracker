"use client";

import Link from "next/link";
import { Check, Flame } from "lucide-react";

import type { Habit } from "@/lib/types";

import { formatNextDayLabel, nextScheduledDateKey } from "../../model/schedule";
import styles from "./HabitListRow.module.css";

export interface HabitListRowProps {
  habit: Habit;
  today: string;
  isDone: boolean;
  activeStreak: number;
  /** 30-day completion rate, 0–100. */
  rate: number;
  onCheck: (habit: Habit) => void;
}

/**
 * HabitListRow — one habit in the library: a check button (logs today's
 * vote), the name/identity linking to the habit's page, the active streak and
 * a 30-day completion bar. The check and the link are siblings (never nested)
 * so each is its own keyboard stop with its own label.
 */
export function HabitListRow({ habit, today, isDone, activeStreak, rate, onCheck }: HabitListRowProps) {
  const nextLabel = formatNextDayLabel(nextScheduledDateKey(today, habit.schedule));

  return (
    <li className={`${styles.row} ${isDone ? styles.rowDone : ""}`}>
      <button
        type="button"
        className={`${styles.check} ${isDone ? styles.checkDone : ""}`}
        onClick={() => onCheck(habit)}
        aria-pressed={isDone}
        aria-label={isDone ? `Uncheck ${habit.name} for today` : `Check ${habit.name} for today`}
      >
        <Check size={18} strokeWidth={2.25} aria-hidden="true" />
      </button>

      <Link href={`/habits/${habit.id}`} className={styles.main}>
        <span className={styles.name}>{habit.name}</span>
        <span className={styles.meta}>
          {habit.identity}
          {nextLabel ? <span className={styles.next}> · {nextLabel}</span> : null}
        </span>
      </Link>

      <span className={`${styles.streak} ${activeStreak > 0 ? styles.streakActive : ""}`}>
        <Flame size={14} strokeWidth={1.75} aria-hidden="true" />
        <span className={styles.srOnly}>Active streak </span>
        <span>{activeStreak}d</span>
      </span>

      <span className={styles.rate}>
        <progress className={styles.rateBar} max={100} value={rate} aria-hidden="true" />
        <span className={styles.srOnly}>30-day completion </span>
        <span className={styles.rateLabel}>{rate}%</span>
      </span>
    </li>
  );
}
