"use client";

import type { Habit } from "@/lib/types";

import { HabitCheckRow } from "./HabitCheckRow";
import { StackCardGroup } from "./StackCardGroup";
import type { TodayItem } from "./today-model";
import styles from "./FocusList.module.css";

export interface FocusListProps {
  items: TodayItem[];
  /** Number of scheduled habits still to do (stacks count every link). */
  remaining: number;
  habits: Habit[];
  today: string;
  streak: (habit: Habit) => number;
  onCheck: (habit: Habit) => void;
}

/**
 * FocusList — the heart of Today: habits scheduled today and not yet done,
 * one tap to check in. Chains render as a single StackCardGroup; everything
 * else is a plain HabitCheckRow linking to the habit's detail page.
 */
export function FocusList({ items, remaining, habits, today, streak, onCheck }: FocusListProps) {
  return (
    <section className={styles.section} aria-labelledby="today-focus-heading">
      <div className={styles.header}>
        <h2 id="today-focus-heading" className={styles.heading}>
          Today&apos;s habits
        </h2>
        <span className={styles.count}>{remaining} left</span>
      </div>
      <ul className={styles.list}>
        {items.map((item) =>
          item.kind === "stack" ? (
            <li key={`stack-${item.rootId}`}>
              <StackCardGroup
                habit={item.visible}
                habits={habits}
                today={today}
                onCheck={onCheck}
                streak={streak}
              />
            </li>
          ) : (
            <li key={item.habit.id}>
              <HabitCheckRow
                habit={item.habit}
                done={false}
                streak={streak(item.habit)}
                onToggle={onCheck}
                href={`/habits/${item.habit.id}`}
              />
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
