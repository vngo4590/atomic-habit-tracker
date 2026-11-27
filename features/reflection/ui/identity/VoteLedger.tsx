"use client";

import { Vote } from "lucide-react";
import Link from "next/link";
import { useId, useMemo } from "react";

import { buttonClassName, Card, EmptyState } from "@/components/ui";
import { identityClaim, isDone as isDayDone } from "@/features/habits";
import type { Habit } from "@/lib/types";

import styles from "./VoteLedger.module.css";

/** Tally of completed check-ins per identity label, highest first. */
export function tallyVotes(habits: Habit[]): Array<[label: string, votes: number]> {
  const tally = new Map<string, number>();
  habits.forEach((habit) => {
    const votes = Object.keys(habit.history).filter((key) => isDayDone(habit.history[key])).length;
    tally.set(habit.identity, (tally.get(habit.identity) ?? 0) + votes);
  });
  return Array.from(tally.entries()).sort((a, b) => b[1] - a[1]);
}

/** VoteLedger — every check-in counted as a vote for its habit's identity. */
export function VoteLedger({ habits }: { habits: Habit[] }) {
  const headingId = useId();
  const ledger = useMemo(() => tallyVotes(habits), [habits]);
  const total = ledger.reduce((sum, [, votes]) => sum + votes, 0);
  const max = Math.max(1, ...ledger.map(([, votes]) => votes));

  return (
    <Card as="section" padding="lg" aria-labelledby={headingId} className={styles.card}>
      <div className={styles.header}>
        <div>
          <h2 id={headingId} className={styles.title}>
            Vote ledger
          </h2>
          <p className={styles.subtitle}>Evidence for each identity you&apos;re building.</p>
        </div>
        <p className={styles.total}>
          <strong>{total}</strong> {total === 1 ? "vote" : "votes"} total
        </p>
      </div>

      {total === 0 ? (
        <EmptyState
          headingLevel={3}
          icon={<Vote strokeWidth={1.75} />}
          title="No votes cast yet"
          action={
            <Link href="/" className={buttonClassName({ variant: "secondary" })}>
              Check in today
            </Link>
          }
        >
          Each time you complete a habit, it counts as a vote for the person you want to be.
        </EmptyState>
      ) : (
        <ul className={styles.list} role="list">
          {ledger.map(([label, votes]) => (
            <li key={label} className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.label}>{identityClaim(label)}</span>
                <span className={styles.votes}>
                  {votes} {votes === 1 ? "vote" : "votes"}
                </span>
              </div>
              <div className={styles.track} aria-hidden="true">
                <div
                  className={styles.fill}
                  // Bar width is data-driven, so it is passed as a custom property.
                  style={{ ["--pct" as string]: `${Math.round((votes / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
