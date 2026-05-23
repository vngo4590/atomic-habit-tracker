"use client";

import { fmt, dateAdd, todayKey } from "@/lib/helpers";
import type { Habit } from "@/lib/types";

import styles from "./HistoryWall.module.css";

/**
 * HistoryWall — a 26-column dot calendar showing the last ~6 months of
 * check-ins for a habit. Each column is a week (7 dots), oldest column
 * on the left, today on the bottom-right.
 *
 * Visual states (colour comes from the global .dot* classes):
 *   • base       – the day exists but no check-in was recorded.
 *   • .l3        – the day was checked in.
 *   • .today     – an outline indicating "today" so the user can find now.
 */
export function HistoryWall({
  habit,
}: {
  habit: Habit;
}) {
  const today = todayKey();
  const cols: { key: string; done: boolean; today: boolean }[][] = [];

  // Build a grid of weeks×days, with the most recent week last so the
  // grid reads naturally left-to-right (older → newer).
  for (let week = 25; week >= 0; week--) {
    const col: { key: string; done: boolean; today: boolean }[] = [];
    for (let day = 6; day >= 0; day--) {
      const offset = week * 7 + day;
      const key = dateAdd(today, -offset);
      col.push({ key, done: Boolean(habit.history[key]), today: key === today });
    }
    cols.push(col.reverse());
  }

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h3 className="h3">26-week wall</h3>
          <div className={`muted ${styles.subtitle}`}>
            Each square is a day logged from your habit check-ins.
          </div>
        </div>
        <div className={styles.legend}>
          <span className={`muted mono ${styles.legendLabel}`}>LESS</span>
          <div className={styles.legendDots}>
            <span className="dot" />
            <span className="dot l1" />
            <span className="dot l2" />
            <span className="dot l3" />
          </div>
          <span className={`muted mono ${styles.legendLabel}`}>MORE</span>
        </div>
      </div>
      <div className="card card-pad">
        <div className="history-wall-scroll">
          <div className={styles.grid}>
            {cols.map((col, index) => (
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
          <span>26 WEEKS AGO</span>
          <span>TODAY</span>
        </div>
      </div>
    </div>
  );
}
