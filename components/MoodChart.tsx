"use client";

import { useMemo } from "react";

import { dateAdd, todayKey } from "@/lib/helpers";
import type { CheckIn, Habit } from "@/lib/types";

import styles from "./MoodChart.module.css";

/** Mood metadata — used both for emoji rendering and for the dot fill
    colour on the chart. Index = mood value - 1. */
const MOODS = [
  { value: 1, face: "😢", label: "Awful", color: "oklch(60% 0.12 30)" },
  { value: 2, face: "😕", label: "Meh", color: "oklch(65% 0.10 60)" },
  { value: 3, face: "😐", label: "Okay", color: "oklch(70% 0.04 90)" },
  { value: 4, face: "🙂", label: "Good", color: "oklch(70% 0.10 145)" },
  { value: 5, face: "😄", label: "Great", color: "oklch(68% 0.13 145)" },
];

/** Safely extract the structured CheckIn payload from a habit history
    entry. The legacy boolean form is treated as "no structured data". */
function checkIn(value: Habit["history"][string]): CheckIn | null {
  return typeof value === "object" && value !== null ? value : null;
}

/**
 * MoodChart — line chart of mood ratings over the last N days. Used on
 * a habit detail page to surface "how this habit makes you feel" over
 * time. Empty state nudges the user to start rating mood on check-in.
 */
export function MoodChart({ habit, days = 30 }: { habit: Habit; days?: number }) {
  // Build a date-aligned series of {key, mood} for the last `days` days.
  // Days without a structured check-in are kept as `null` so we can draw
  // gaps in the line rather than imputing zero.
  const data = useMemo(() => {
    const points: { key: string; mood: number | null }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const key = dateAdd(todayKey(), -i);
      points.push({ key, mood: checkIn(habit.history[key])?.mood ?? null });
    }
    return points;
  }, [days, habit.history]);

  const moodPoints = data.filter((point): point is { key: string; mood: number } => point.mood !== null);
  const avg = moodPoints.length
    ? moodPoints.reduce((sum, point) => sum + point.mood, 0) / moodPoints.length
    : 0;

  if (moodPoints.length === 0) {
    return (
      <div className={`card card-pad ${styles.emptyCard}`}>
        <div className={styles.emptyTitle}>No mood data yet.</div>
        <div className={`muted ${styles.emptyBody}`}>
          Rate how you feel when you check in. The pattern over time shows which habits energize you.
        </div>
      </div>
    );
  }

  // SVG geometry — internal viewBox, scales fluidly via the .svg class.
  const width = 600;
  const height = 140;
  const pad = 28;
  const chartWidth = width - pad * 2;
  const chartHeight = height - pad * 2;
  const xStep = chartWidth / Math.max(1, days - 1);
  const yFor = (value: number) => pad + chartHeight - ((value - 1) / 4) * chartHeight;

  // SVG path through the rated points. Null moods break the path so the
  // chart shows gaps where the user didn't check in.
  const path = data
    .map((point, index) => {
      if (point.mood === null) return "";
      const x = pad + index * xStep;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${yFor(point.mood).toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");

  return (
    <div className="card card-pad">
      <div className={styles.header}>
        <div>
          <h3 className="h3">How it makes you feel</h3>
          <div className={`muted ${styles.subtitle}`}>
            Last {days} days · {moodPoints.length} check-ins rated
          </div>
        </div>
        <div className={styles.avgBlock}>
          <div className={`mono ${styles.avgValue}`}>
            {MOODS[Math.round(avg) - 1]?.face} {avg.toFixed(1)}
          </div>
          <div className={`muted mono ${styles.avgLabel}`}>AVG</div>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg}>
        {[1, 2, 3, 4, 5].map((value) => (
          <g key={value}>
            <line
              x1={pad}
              x2={width - pad}
              y1={yFor(value)}
              y2={yFor(value)}
              stroke="var(--rule)"
              strokeDasharray={value === 3 ? "0" : "2 4"}
            />
            <text x={4} y={yFor(value) + 3} fontSize="10" fontFamily="var(--mono)" fill="var(--ink-3)">
              {value}
            </text>
          </g>
        ))}
        <path d={path} stroke="var(--accent)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((point, index) => {
          if (point.mood === null) return null;
          const x = pad + index * xStep;
          return (
            <circle
              key={point.key}
              cx={x}
              cy={yFor(point.mood)}
              r="3"
              fill={MOODS[point.mood - 1].color}
              stroke="var(--bg-elev)"
              strokeWidth="1.5"
            />
          );
        })}
        <text x={pad} y={height - 6} fontSize="9" fontFamily="var(--mono)" fill="var(--ink-3)">
          {days}D AGO
        </text>
        <text
          x={width - pad}
          y={height - 6}
          fontSize="9"
          fontFamily="var(--mono)"
          fill="var(--ink-3)"
          textAnchor="end"
        >
          TODAY
        </text>
      </svg>
    </div>
  );
}
