"use client";

import { useMemo, useState, type CSSProperties } from "react";

import { fmt, dateAdd, todayKey } from "@/lib/helpers";
import type { Habit } from "@/lib/types";

import styles from "./HistoryWall.module.css";

/**
 * HistoryWall — a read-only calendar of habit check-ins for the detail page.
 *
 * The user can choose:
 *   • View   — "This week" (the last 7 days) or "26 weeks" (the last ~6 months).
 *   • Order  — "Oldest first" (older on the left, today on the right) or
 *              "Newest first" (today on the left, older on the right).
 *
 * The wall used to render with a 4-step gradient (`l1`, `l2`, `l3`), but for
 * a single habit a day can only be done once or not at all, so the gradient
 * was misleading. The legend is now a clear binary indicator plus a "today"
 * marker.
 */

type View = "week" | "26weeks";
type Order = "oldest-first" | "newest-first";

interface DayCell {
  key: string;
  done: boolean;
  today: boolean;
}

const TOTAL_WEEKS = 26;

export function HistoryWall({ habit }: { habit: Habit }) {
  const [view, setView] = useState<View>("26weeks");
  const [order, setOrder] = useState<Order>("oldest-first");

  // Recompute the grid whenever the habit's history or controls change. The
  // grid is modelled as an array of columns; each column is one or more day
  // cells. Two layouts share the same rendering primitive:
  //   • week view      — 7 columns × 1 day  (a horizontal row of 7 dots)
  //   • 26-weeks view  — 26 columns × 7 days (the classic GitHub-style wall)
  const baseCols = useMemo<DayCell[][]>(() => {
    const today = todayKey();

    if (view === "week") {
      // Build 7 single-day columns from "6 days ago" to today.
      const cols: DayCell[][] = [];
      for (let day = 6; day >= 0; day--) {
        const key = dateAdd(today, -day);
        cols.push([{ key, done: Boolean(habit.history[key]), today: key === today }]);
      }
      return cols;
    }

    // 26 weeks, oldest week first. Each column has 7 days top-to-bottom from
    // older to newer day-of-week so the visual layout matches the previous
    // implementation that callers and tests expect.
    const cols: DayCell[][] = [];
    for (let week = TOTAL_WEEKS - 1; week >= 0; week--) {
      const col: DayCell[] = [];
      for (let day = 6; day >= 0; day--) {
        const offset = week * 7 + day;
        const key = dateAdd(today, -offset);
        col.push({ key, done: Boolean(habit.history[key]), today: key === today });
      }
      cols.push(col.reverse());
    }
    return cols;
  }, [habit.history, view]);

  // Apply the order toggle as a pure rendering transform. The underlying
  // data stays oldest-first so downstream consumers (a11y labels, titles)
  // never see ordering ambiguity.
  const displayCols = order === "newest-first" ? [...baseCols].reverse() : baseCols;

  const headingText = view === "week" ? "This week" : "26-week wall";
  const oldestLabel = view === "week" ? "6 DAYS AGO" : "26 WEEKS AGO";
  const leftFooter = order === "oldest-first" ? oldestLabel : "TODAY";
  const rightFooter = order === "oldest-first" ? "TODAY" : oldestLabel;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h3 className="h3">{headingText}</h3>
          <div className={`muted ${styles.subtitle}`}>
            Each square is a day logged from your habit check-ins.
          </div>
        </div>
        <div className={styles.legend} aria-label="Wall legend">
          <span className={styles.legendItem}>
            <span className={`dot l3 ${styles.legendDot}`} aria-hidden />
            <span className={`muted mono ${styles.legendLabel}`}>DONE</span>
          </span>
          <span className={styles.legendItem}>
            <span className={`dot ${styles.legendDot}`} aria-hidden />
            <span className={`muted mono ${styles.legendLabel}`}>MISSED</span>
          </span>
          <span className={styles.legendItem}>
            <span className={`dot today ${styles.legendDot}`} aria-hidden />
            <span className={`muted mono ${styles.legendLabel}`}>TODAY</span>
          </span>
        </div>
      </div>

      <div className={styles.controls} role="group" aria-label="History wall view options">
        <div className={styles.controlGroup} role="group" aria-label="Range">
          <button
            type="button"
            className={`btn ${view === "week" ? "btn-primary" : ""}`}
            aria-pressed={view === "week"}
            onClick={() => setView("week")}
          >
            This week
          </button>
          <button
            type="button"
            className={`btn ${view === "26weeks" ? "btn-primary" : ""}`}
            aria-pressed={view === "26weeks"}
            onClick={() => setView("26weeks")}
          >
            26 weeks
          </button>
        </div>
        <div className={styles.controlGroup} role="group" aria-label="Order">
          <button
            type="button"
            className={`btn ${order === "oldest-first" ? "btn-primary" : ""}`}
            aria-pressed={order === "oldest-first"}
            onClick={() => setOrder("oldest-first")}
          >
            Oldest first
          </button>
          <button
            type="button"
            className={`btn ${order === "newest-first" ? "btn-primary" : ""}`}
            aria-pressed={order === "newest-first"}
            onClick={() => setOrder("newest-first")}
          >
            Newest first
          </button>
        </div>
      </div>

      <div className="card card-pad">
        {/*
          The wallBox wrapper deliberately uses overflow: visible and a small
          inner pad so the bottom row's `today` dot outline is never clipped
          on mobile. (The legacy `.history-wall-scroll` class implicitly forced
          overflow-y: clip via the spec when overflow-x was auto, which was
          the real cause of the "blocks look cut off" bug.)
        */}
        <div className={styles.wallBox}>
          <div
            className={styles.grid}
            style={
              {
                // Per-view sizing passed as CSS variables so a single grid
                // rule handles both the 7-column week view and the 26-column
                // wall. --max-cell caps how big each dot can grow on wide
                // screens, so a 7-column wall does not stretch into giant
                // tiles on desktop, while still letting cells shrink to fit
                // narrow phones (overflow-free).
                "--cols": view === "week" ? 7 : TOTAL_WEEKS,
                "--max-cell": view === "week" ? "20px" : "12px",
              } as CSSProperties
            }
          >
            {displayCols.map((col, index) => (
              <div key={index} className={styles.column}>
                {col.map((day) => (
                  <span
                    key={day.key}
                    title={`${fmt.short(day.key)} · ${day.done ? "done" : "missed"}`}
                    className={`dot ${day.done ? "l3" : ""} ${day.today ? "today" : ""} ${styles.cell}`}
                    aria-label={`${fmt.short(day.key)} ${day.done ? "done" : "missed"}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className={`muted mono ${styles.footer}`}>
          <span>{leftFooter}</span>
          <span>{rightFooter}</span>
        </div>
      </div>
    </div>
  );
}
