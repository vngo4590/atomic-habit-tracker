"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

import { IconCheck } from "@/components/Icons";
import { getStackChain } from "@/lib/stack";
import { completionRate } from "@/lib/store";
import type { Habit } from "@/lib/types";

export function StackCardGroup({
  habit,
  habits,
  onCheck,
  onNavigate,
  streak,
  today,
}: {
  habit: Habit;
  habits: Habit[];
  onCheck: (habit: Habit) => void;
  onNavigate: (habitId: string) => void;
  streak: (habit: Habit) => number;
  today?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const chain = getStackChain(habit, habits);
  const visibleCount = expanded ? Math.min(chain.length, 3) : 1;
  const remaining = chain.length - visibleCount;

  return (
    <div style={{ marginBottom: 8 }}>
      <AnimatePresence>
        {chain.slice(0, visibleCount).map((h, index) => {
          const activeStreak = streak(h);
          const rate = Math.round(completionRate(h) * 100);
          const isDone = Boolean(today ? h.history[today] : Object.keys(h.history).length > 0);
          // For the first card, use today's date from parent context if available
          // The parent passes the first undone habit; we show chain from there

          return (
            <motion.div
              key={h.id}
              className="card card-pad click-row habit-list-row"
              style={{
                gridTemplateColumns: "44px minmax(0, 1fr) 80px 140px",
                alignItems: "center",
                marginBottom: index < visibleCount - 1 ? 8 : 0,
                position: "relative",
                zIndex: visibleCount - index,
              }}
              initial={expanded ? { opacity: 0, y: -8 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
              onClick={() => {
                if (index === 0 && !expanded && chain.length > 1) {
                  setExpanded(true);
                } else {
                  onNavigate(h.id);
                }
              }}
            >
              <div className="habit-list-field" style={{ alignItems: "center" }}>
                <motion.button
                  className={`check ${isDone ? "done" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onCheck(h);
                  }}
                  aria-label={isDone ? "Uncheck" : "Check"}
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                >
                  <IconCheck />
                </motion.button>
              </div>

              <div className="habit-list-field">
                <div style={{ minWidth: 0 }}>
                  <div className="habit-name">{h.name}</div>
                  <div
                    className="mono muted"
                    style={{
                      fontSize: 10.5,
                      marginTop: 3,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {h.identity}
                    {isDone && <span style={{ marginLeft: 8, color: "var(--accent)" }}>· Done</span>}
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
        })}
      </AnimatePresence>

      {expanded && remaining > 0 && (
        <div
          className="muted mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textAlign: "center",
            padding: "6px 0",
          }}
        >
          +{remaining} more
        </div>
      )}

      {expanded && (
        <button
          className="btn btn-sm btn-ghost"
          style={{ display: "block", margin: "8px auto 0" }}
          onClick={() => setExpanded(false)}
        >
          Collapse stack
        </button>
      )}
    </div>
  );
}
