"use client";

import { IconArrow, IconCheck, IconFlame } from "@/components/Icons";
import type { Habit } from "@/lib/types";

export function HabitRow({
  habit,
  done,
  streak,
  onCheck,
  onOpen,
}: {
  habit: Habit;
  done: boolean;
  streak: number;
  onCheck: () => void;
  onOpen: () => void;
}) {
  return (
    <div className={`habit-row ${done ? "done" : ""}`} onClick={onOpen}>
      <button
        className={`check ${done ? "done" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          onCheck();
        }}
        aria-label={done ? "Uncheck" : "Check"}
      >
        <IconCheck />
      </button>
      <div>
        <div className="habit-name">{habit.name}</div>
        <div className="habit-meta">
          <span>{habit.stack ? `-> ${habit.stack}` : habit.cue.slice(0, 40)}</span>
          <span className="dot">.</span>
          <span>{habit.identity}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          className="chip"
          style={{
            background: done ? "var(--accent-soft)" : "transparent",
            borderColor: done ? "transparent" : "var(--rule)",
            color: done ? "oklch(35% 0.10 60)" : "var(--ink-3)",
            fontStyle: "normal",
            fontSize: 10,
          }}
        >
          {done ? "+1" : "."}{" "}
          <span
            style={{
              fontStyle: "italic",
              fontFamily: "var(--serif)",
              textTransform: "none",
              letterSpacing: 0,
              fontSize: 12,
            }}
          >
            {habit.identity}
          </span>
        </span>
        {streak > 0 && (
          <div className="streak-pill">
            <IconFlame /> {streak}
          </div>
        )}
        <IconArrow style={{ width: 14, height: 14, color: "var(--ink-4)" }} />
      </div>
    </div>
  );
}
