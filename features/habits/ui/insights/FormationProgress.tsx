import { Check, Circle } from "lucide-react";
import { useId } from "react";

import { Button, Card } from "@/components/ui";
import type { Habit } from "@/lib/types";

import { daysSince, FORMATION_DAYS } from "./formation";
import styles from "./HallOfFame.module.css";
import { Meter } from "./Meter";
import { isDone as isDayDone } from "../../model/metrics";

interface FormationProgressProps {
  habits: Habit[];
  today: string;
  streak: (habit: Habit) => number;
  completionRate: (habit: Habit, days?: number) => number;
  /** Re-opens the review for habits past 66 days that were marked "keep practicing". */
  onReview: (habit: Habit) => void;
}

/** Younger habits on their way to 66 days, closest to review first. */
export function FormationProgress({ habits, today, streak, completionRate, onReview }: FormationProgressProps) {
  const headingId = useId();
  return (
    <Card as="section" padding="lg" aria-labelledby={headingId} className={styles.card}>
      <div>
        <h2 id={headingId} className={styles.title}>
          In progress
        </h2>
        <p className={styles.subtitle}>Days since each habit started, out of {FORMATION_DAYS}.</p>
      </div>
      {habits.length ? (
        <ul className={styles.rows} role="list">
          {habits.map((habit) => {
            const age = daysSince(habit.createdAt, today);
            const doneToday = isDayDone(habit.history[today]);
            return (
              <li key={habit.id} className={styles.progressRow}>
                <div className={styles.progressHead}>
                  <span className={styles.name}>
                    <span aria-hidden="true">{habit.emoji}</span> {habit.name}
                  </span>
                  <span className={styles.count}>
                    {age < FORMATION_DAYS ? `${age} / ${FORMATION_DAYS} days` : `${age} days · keep practicing`}
                  </span>
                </div>
                <Meter
                  pct={Math.min(100, (age / FORMATION_DAYS) * 100)}
                  label={`${habit.name} formation progress`}
                  valueText={`${age} of ${FORMATION_DAYS} days`}
                />
                <ul className={styles.tags} role="list">
                  <li className={styles.tag} data-done={doneToday}>
                    {doneToday ? (
                      <Check size={14} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <Circle size={14} strokeWidth={1.75} aria-hidden="true" />
                    )}
                    {doneToday ? "Done today" : "Open today"}
                  </li>
                  <li className={styles.tag}>{streak(habit)}d active</li>
                  <li className={styles.tag}>{Math.round(completionRate(habit, 30) * 100)}% 30-day</li>
                </ul>
                {age >= FORMATION_DAYS ? (
                  <Button size="sm" variant="secondary" aria-label={`Review ${habit.name} again`} onClick={() => onReview(habit)}>
                    Review again
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.subtitle}>Every habit has reached review. New habits will appear here as they start.</p>
      )}
    </Card>
  );
}
