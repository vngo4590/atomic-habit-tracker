import { Sprout } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import { Badge, buttonClassName, Card, EmptyState } from "@/components/ui";
import type { Habit } from "@/lib/types";

import { Meter } from "./Meter";
import styles from "./HabitBreakdown.module.css";

export interface HabitRow {
  habit: Habit;
  /** Completion over the selected range, 0–100. */
  pct: number;
  streak: number;
  best: number;
  atRisk: boolean;
}

/** Per-habit completion for the selected range, best first. */
export function HabitBreakdown({ rows, days }: { rows: HabitRow[]; days: number }) {
  const headingId = useId();
  return (
    <Card as="section" padding="lg" aria-labelledby={headingId} className={styles.card}>
      <div>
        <h2 id={headingId} className={styles.title}>
          By habit
        </h2>
        <p className={styles.subtitle}>Completion over the last {days} days.</p>
      </div>
      {rows.length ? (
        <ul className={styles.list} role="list">
          {rows.map(({ habit, pct, streak, best, atRisk }) => (
            <li key={habit.id} className={styles.row}>
              <div className={styles.head}>
                <Link href={`/habits/${habit.id}`} className={styles.name}>
                  <span aria-hidden="true">{habit.emoji}</span> {habit.name}
                </Link>
                <span className={styles.pct}>{pct}%</span>
              </div>
              <Meter pct={pct} tone={atRisk ? "warning" : "primary"} />
              <div className={styles.meta}>
                <span>{streak}-day streak</span>
                <span aria-hidden="true">·</span>
                <span>best {best}</span>
                {atRisk ? <Badge tone="warning">At risk</Badge> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          headingLevel={3}
          icon={<Sprout strokeWidth={1.75} />}
          title="No habits to analyse yet"
          action={
            <Link href="/habits/new" className={buttonClassName({ variant: "secondary", size: "sm" })}>
              Create a habit
            </Link>
          }
        >
          Add a habit and check in for a few days to see how each one is going.
        </EmptyState>
      )}
    </Card>
  );
}
