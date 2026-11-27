import { useId } from "react";

import { LineChart } from "@/components/LineChart";
import { Card } from "@/components/ui";

import type { DayPoint } from "./analytics-data";
import styles from "./CompletionTrend.module.css";

/**
 * Daily completion line chart. The SVG is summarised in a caption and the
 * exact numbers are available in a collapsible data table, so the chart is
 * never the only way to read the trend.
 */
export function CompletionTrend({ points, days }: { points: DayPoint[]; days: number }) {
  const headingId = useId();
  const tracked = points.filter((point) => point.scheduled > 0);
  const average = tracked.length ? Math.round(tracked.reduce((sum, point) => sum + point.pct, 0) / tracked.length) : 0;
  const latest = tracked[tracked.length - 1];

  return (
    <Card as="section" padding="lg" aria-labelledby={headingId} className={styles.card}>
      <h2 id={headingId} className={styles.title}>
        Daily completion
      </h2>
      <figure className={styles.figure}>
        <LineChart data={points.map(({ label, pct }) => ({ label, pct }))} />
        <figcaption className={styles.caption}>
          {tracked.length
            ? `Last ${days} days · average ${average}% of scheduled habits done per day${
                latest ? ` · most recent ${latest.label}: ${latest.pct}%` : ""
              }`
            : `No habits were scheduled in the last ${days} days.`}
        </figcaption>
      </figure>
      <details className={styles.details}>
        <summary className={styles.summary}>Show daily numbers</summary>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Daily completion, last {days} days</caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Done</th>
                <th scope="col">Completion</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((point) => (
                <tr key={point.key}>
                  <th scope="row">{point.label}</th>
                  <td>
                    {point.done} / {point.scheduled}
                  </td>
                  <td>{point.scheduled ? `${point.pct}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}
