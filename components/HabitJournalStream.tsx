"use client";

import { IconTrash } from "@/components/Icons";
import { fmt } from "@/lib/helpers";
import type { CheckIn, Habit } from "@/lib/types";

function checkIn(value: Habit["history"][string]): CheckIn | null {
  return typeof value === "object" && value !== null ? value : null;
}

export function HabitJournalStream({
  habit,
  onClearEntry,
}: {
  habit: Habit;
  onClearEntry: (dateKey: string) => void;
}) {
  const entries = Object.entries(habit.history)
    .map(([date, value]) => ({ date, entry: checkIn(value) }))
    .filter((item): item is { date: string; entry: CheckIn } => Boolean(item.entry?.journal || item.entry?.mood))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (entries.length === 0) {
    return (
      <div className="card card-pad" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", color: "var(--ink-3)", marginBottom: 8 }}>
          No journal entries for this habit yet.
        </div>
        <div className="muted" style={{ fontSize: 12.5 }}>
          When you check it done, you can capture a mood and quick note. Those entries will live here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {entries.map(({ date, entry }) => (
        <div key={date} className="card card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: entry.journal ? 8 : 0 }}>
            <div>
              <div className="muted mono" style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {fmt.short(date)}
              </div>
              {entry.mood && <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 1 }}>Mood {entry.mood}/5</div>}
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => onClearEntry(date)}>
              <IconTrash style={{ width: 12, height: 12 }} />
            </button>
          </div>
          {entry.journal && (
            <p style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.5, color: "var(--ink-2)" }}>
              {entry.journal}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
