import { Trophy } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import { buttonClassName, Card, EmptyState } from "@/components/ui";
import type { FormationVerdict, Habit } from "@/lib/types";

import { FORMATION_DAYS } from "./formation";
import styles from "./HallOfFame.module.css";

interface InductedListProps {
  items: Array<{ habit: Habit; verdict: FormationVerdict }>;
  longestStreak: (habit: Habit) => number;
  completionRate: (habit: Habit) => number;
}

/** Habits confirmed as formed, as calm cards; explains induction when empty. */
export function InductedList({ items, longestStreak, completionRate }: InductedListProps) {
  const headingId = useId();
  return (
    <Card as="section" padding="lg" aria-labelledby={headingId} className={styles.card}>
      <div className={styles.sectionHead}>
        <Trophy className={styles.sectionIcon} size={20} strokeWidth={1.75} aria-hidden="true" />
        <h2 id={headingId} className={styles.title}>
          Inducted
        </h2>
      </div>
      {items.length ? (
        <ul className={styles.inductedGrid} role="list">
          {items.map(({ habit, verdict }) => (
            <li key={habit.id} className={styles.inductedCard}>
              <span className={styles.inductedEmoji} aria-hidden="true">
                {habit.emoji}
              </span>
              <h3 className={styles.name}>{habit.name}</h3>
              <p className={styles.meta}>I am {habit.identity}</p>
              <dl className={styles.stats}>
                <div>
                  <dt>Score</dt>
                  <dd>{verdict.score}</dd>
                </div>
                <div>
                  <dt>Best streak</dt>
                  <dd>{longestStreak(habit)}d</dd>
                </div>
                <div>
                  <dt>Adherence</dt>
                  <dd>{Math.round(completionRate(habit) * 100)}%</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          headingLevel={3}
          title="No inducted habits yet"
          action={
            <Link href="/" className={buttonClassName({ variant: "secondary", size: "sm" })}>
              Keep checking in
            </Link>
          }
        >
          After {FORMATION_DAYS} days a habit becomes ready for review. Answer five quick questions and, if it now
          feels automatic, it is inducted here.
        </EmptyState>
      )}
    </Card>
  );
}
