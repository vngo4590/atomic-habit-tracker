"use client";

import { fmt, dateAdd, todayKey } from "@/lib/helpers";
import type { Habit } from "@/lib/types";

export function HistoryWall({
  habit,
  onToggle,
}: {
  habit: Habit;
  onToggle: (dateKey: string) => void;
}) {
  const today = todayKey();
  const cols = [];

  for (let week = 25; week >= 0; week--) {
    const col = [];
    for (let day = 6; day >= 0; day--) {
      const offset = week * 7 + day;
      const key = dateAdd(today, -offset);
      col.push({ key, done: Boolean(habit.history[key]), today: key === today });
    }
    cols.push(col.reverse());
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
        <div>
          <h3 className="h3">26-week wall</h3>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
            Each square is a day. Click to toggle. Don&apos;t break the chain.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span className="muted mono" style={{ fontSize: 10 }}>LESS</span>
          <div style={{ display: "flex", gap: 3 }}>
            <span className="dot" />
            <span className="dot l1" />
            <span className="dot l2" />
            <span className="dot l3" />
          </div>
          <span className="muted mono" style={{ fontSize: 10 }}>MORE</span>
        </div>
      </div>
      <div className="card card-pad">
        <div style={{ display: "flex", gap: 3 }}>
          {cols.map((col, index) => (
            <div key={index} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {col.map((day) => (
                <button
                  key={day.key}
                  title={`${fmt.short(day.key)} · ${day.done ? "done" : "missed"}`}
                  onClick={() => onToggle(day.key)}
                  className={`dot ${day.done ? "l3" : ""} ${day.today ? "today" : ""}`}
                  style={{ border: 0, padding: 0, cursor: "pointer" }}
                  aria-label={`Toggle ${fmt.short(day.key)}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="muted mono" style={{ fontSize: 10, letterSpacing: "0.06em", marginTop: 14, display: "flex", justifyContent: "space-between" }}>
          <span>26 WEEKS AGO</span><span>TODAY</span>
        </div>
      </div>
    </div>
  );
}
