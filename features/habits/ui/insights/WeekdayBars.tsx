import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import { buttonClassName, Card, EmptyState } from "@/components/ui";

import type { WeekdayRate } from "./analytics-data";
import { Meter } from "./Meter";
import styles from "./WeekdayBars.module.css";

/** Completion by weekday (Monday first) — spots the days that slip. */
export function WeekdayBars({ rates, days }: { rates: WeekdayRate[]; days: number }) {
  const headingId = useId();
  const hasData = rates.some((rate) => rate.total > 0);

  return (
    <Card as="section" padding="lg" aria-labelledby={headingId} className={styles.card}>
      <div>
        <h2 id={headingId} className={styles.title}>
          By weekday
        </h2>
        <p className={styles.subtitle}>Share of scheduled habits done, last {days} days.</p>
      </div>
      {hasData ? (
        <ul className={styles.list} role="list">
          {rates.map((rate) => (
            <li key={rate.label} className={styles.row} aria-label={`${rate.label} completion ${rate.pct}%`}>
              <span className={styles.day} aria-hidden="true">
                {rate.label}
              </span>
              <Meter pct={rate.pct} />
              <span className={styles.pct} aria-hidden="true">
                {rate.pct}%
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          headingLevel={3}
          icon={<CalendarDays strokeWidth={1.75} />}
          title="No weekday data yet"
          action={
            <Link href="/" className={buttonClassName({ variant: "secondary", size: "sm" })}>
              Go to Today
            </Link>
          }
        >
          Check in a habit to see completion patterns by day.
        </EmptyState>
      )}
    </Card>
  );
}
