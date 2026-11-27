import { Hourglass } from "lucide-react";
import { useId } from "react";

import { Button, Card } from "@/components/ui";
import { identityClaim } from "@/features/habits";
import type { Habit } from "@/lib/types";

import { daysSince } from "./formation";
import styles from "./HallOfFame.module.css";

interface ReadyForReviewProps {
  habits: Habit[];
  today: string;
  onReview: (habit: Habit) => void;
}

/** Habits past 66 days awaiting a verdict — the page's one primary action. */
export function ReadyForReview({ habits, today, onReview }: ReadyForReviewProps) {
  const headingId = useId();
  if (!habits.length) return null;
  return (
    <Card as="section" padding="lg" aria-labelledby={headingId} className={`${styles.card} ${styles.ready}`}>
      <div className={styles.sectionHead}>
        <Hourglass className={styles.sectionIcon} size={20} strokeWidth={1.75} aria-hidden="true" />
        <div>
          <h2 id={headingId} className={styles.title}>
            Ready for review
          </h2>
          <p className={styles.subtitle}>These habits have passed 66 days. Is each one automatic yet?</p>
        </div>
      </div>
      <ul className={styles.rows} role="list">
        {habits.map((habit, index) => (
          <li key={habit.id} className={styles.readyRow}>
            <div className={styles.rowText}>
              <span className={styles.name}>
                <span aria-hidden="true">{habit.emoji}</span> {habit.name}
              </span>
              <span className={styles.meta}>
                {daysSince(habit.createdAt, today)} days · {identityClaim(habit.identity)}
              </span>
            </div>
            <Button
              size="sm"
              variant={index === 0 ? "primary" : "secondary"}
              aria-label={`Review ${habit.name}`}
              onClick={() => onReview(habit)}
            >
              Review
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
