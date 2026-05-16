"use client";

import { motion } from "framer-motion";

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
    <motion.div
      className={`habit-row ${done ? "done" : ""}`}
      onClick={onOpen}
      whileHover={{ x: 4 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <motion.button
        className={`check ${done ? "done" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          onCheck();
        }}
        aria-label={done ? "Uncheck" : "Check"}
        whileTap={{ scale: 0.85 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
      >
        <IconCheck />
      </motion.button>
      <div>
        <div className="habit-name">{habit.name}</div>
        <div className="habit-meta">
          <span>{habit.stack ? `-> ${habit.stack}` : habit.cue.slice(0, 40)}</span>
          <span className="dot">.</span>
          <span>{habit.identity}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <motion.span
          className="chip"
          style={{
            background: done ? "var(--accent-soft)" : "transparent",
            borderColor: done ? "transparent" : "var(--rule)",
            color: done ? "oklch(35% 0.10 60)" : "var(--ink-3)",
            fontStyle: "normal",
            fontSize: 10,
          }}
          animate={
            done
              ? { scale: [1, 1.15, 1], background: "var(--accent-soft)" }
              : { scale: 1, background: "transparent" }
          }
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
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
        </motion.span>
        {streak > 0 && (
          <motion.div
            className="streak-pill"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            key={streak}
          >
            <IconFlame /> {streak}
          </motion.div>
        )}
        <IconArrow style={{ width: 14, height: 14, color: "var(--ink-4)" }} />
      </div>
    </motion.div>
  );
}
