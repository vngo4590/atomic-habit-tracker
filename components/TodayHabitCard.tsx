"use client";

import { motion } from "framer-motion";

import { IconCheck } from "@/components/Icons";
import { completionRate, streak } from "@/lib/store";
import type { Habit } from "@/lib/types";

/**
 * A single habit card row for the Today page list.
 * Shows check circle, name + identity, streak, and 30-day progress.
 */

interface TodayHabitCardProps {
  habit: Habit;
  onCheck: () => void;
  onNavigate: () => void;
  reduced?: boolean;
}

export function TodayHabitCard({ habit, onCheck, onNavigate, reduced }: TodayHabitCardProps) {
  const activeStreak = streak(habit);
  const rate = Math.round(completionRate(habit) * 100);

  return (
    <motion.div
      className="click-row habit-list-row"
      style={{
        gridTemplateColumns: "44px minmax(0, 1fr) 80px 140px",
        alignItems: "center",
      }}
      onClick={onNavigate}
      whileHover={reduced ? undefined : { y: -2, boxShadow: "var(--shadow-md)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="habit-list-field" style={{ alignItems: "center" }}>
        <motion.button
          className="check"
          onClick={(event) => {
            event.stopPropagation();
            onCheck();
          }}
          aria-label="Check"
          whileTap={{ scale: 0.85 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
        >
          <IconCheck />
        </motion.button>
      </div>

      <div className="habit-list-field">
        <div style={{ minWidth: 0 }}>
          <div className="habit-name">{habit.name}</div>
          <div
            className="mono muted"
            style={{
              fontSize: 10.5,
              marginTop: 3,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {habit.identity}
          </div>
        </div>
      </div>

      <div className="habit-list-field">
        <div
          className="mono"
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: activeStreak > 0 ? "var(--ink)" : "var(--ink-3)",
          }}
        >
          {activeStreak}d
        </div>
      </div>

      <div className="habit-list-field">
        <div className="habit-list-progress">
          <div
            style={{
              flex: 1,
              height: 4,
              background: "var(--bg-sunk)",
              borderRadius: 99,
              overflow: "hidden",
            }}
          >
            <motion.div
              style={{ height: "100%", background: "var(--accent)" }}
              initial={{ width: 0 }}
              animate={{ width: `${rate}%` }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              minWidth: 28,
              textAlign: "right",
            }}
          >
            {rate}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
