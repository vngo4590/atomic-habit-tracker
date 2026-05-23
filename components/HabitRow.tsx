"use client";

import { motion } from "framer-motion";

import { IconArrow, IconCheck, IconFlame } from "@/components/Icons";
import type { Habit } from "@/lib/types";

import styles from "./HabitRow.module.css";

/**
 * HabitRow — one habit row as it appears on Today and All Habits.
 *
 * Structure (3 grid columns, see .habit-row in components.css):
 *   [ check button ]  [ name + meta ]  [ vote chip + streak + arrow ]
 *
 * Interaction:
 *  - Clicking the check button toggles completion (stops propagation so
 *    the row does not also navigate).
 *  - Clicking anywhere else on the row opens the habit detail page.
 *  - When `done` is true the row applies the global .done modifier which
 *    line-throughs the name; this component also swaps the vote chip
 *    variant from `pending` to `done`.
 */
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
      whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
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
          <span>{habit.cue.slice(0, 40)}</span>
          <span className="dot">.</span>
          <span>{habit.identity}</span>
        </div>
      </div>
      <div className={styles.meta}>
        {/* Vote chip — pulses briefly when the row transitions to done. */}
        <motion.span
          className={`chip ${styles.voteChip} ${done ? styles.voteChipDone : styles.voteChipPending}`}
          animate={done ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >
          {done ? "+1" : "."}{" "}
          <span className={styles.identityLabel}>{habit.identity}</span>
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
        <IconArrow className={styles.arrow} />
      </div>
    </motion.div>
  );
}
