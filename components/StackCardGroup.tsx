"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";

import { IconCheck } from "@/components/Icons";
import { getChainFrom } from "@/lib/stack";
import { completionRate } from "@/lib/store";
import type { Habit } from "@/lib/types";

/**
 * Apple-Wallet / Apple-Watch style stacked card for habit chains on the
 * Today screen.
 *
 * Behaviour requirements:
 *   - Always show the top card (the first undone habit forwarded into this
 *     component by the Today page).
 *   - When collapsed: show the top card with 1–2 "peek" slivers behind it so
 *     the user immediately sees a stack exists.
 *   - When expanded: show top card + up to 2 upcoming undone cards
 *     ("at most 2 upcoming"). If more remain, render a "+N more" indicator
 *     where N excludes the cards being displayed.
 *   - Use `getChainFrom(habit, habits)` so the visible sub-chain starts at
 *     the passed habit (not the chain's root), avoiding the mid-chain bug.
 */
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

  // Walk forward from the passed habit (which the Today page selects as the
  // first undone habit) and keep only undone entries — the user wants to see
  // habits still to be fulfilled.
  const upcoming = useMemo(() => {
    const subChain = getChainFrom(habit, habits);
    if (!today) return subChain;
    return subChain.filter((h) => !h.history[today]);
  }, [habit, habits, today]);

  // Top card is always first; expanded view shows top + at most 2 upcoming.
  const MAX_VISIBLE = 3;
  const visible = upcoming.slice(0, MAX_VISIBLE);
  const remaining = Math.max(upcoming.length - MAX_VISIBLE, 0);
  // Peek slivers behind the top card (collapsed view) — capped at 2.
  const peekCount = Math.min(Math.max(upcoming.length - 1, 0), 2);

  /** Single habit row used by both collapsed top card and expanded list. */
  const renderRow = (h: Habit, index: number, total: number, onClick: () => void) => {
    const activeStreak = streak(h);
    const rate = Math.round(completionRate(h) * 100);
    const isDone = Boolean(today ? h.history[today] : Object.keys(h.history).length > 0);
    return (
      <motion.div
        key={h.id}
        data-testid="stack-card"
        data-stack-card-position={index}
        className="card card-pad click-row habit-list-row"
        style={{
          gridTemplateColumns: "44px minmax(0, 1fr) 80px 140px",
          alignItems: "center",
          marginBottom: index < total - 1 ? 8 : 0,
          position: "relative",
          zIndex: total - index,
        }}
        initial={expanded ? { opacity: 0, y: -8 } : false}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, delay: index * 0.05 }}
        onClick={onClick}
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
  };

  const top = visible[0];
  if (!top) return null;

  if (!expanded) {
    /**
     * Collapsed wallet view: the top card sits on top of 1–2 peek slivers
     * — small, faded, translated-down clones suggesting more habits exist.
     * Tapping the whole stack expands; tapping the check on the top card
     * still toggles done via stopPropagation in renderRow.
     */
    return (
      <div
        data-testid="stack-card-group"
        data-stack-expanded="false"
        data-stack-chain-length={upcoming.length}
        style={{ position: "relative", marginBottom: 8 + peekCount * 8 }}
        onClick={() => {
          if (upcoming.length > 1) setExpanded(true);
        }}
        role={upcoming.length > 1 ? "button" : undefined}
        aria-label={
          upcoming.length > 1
            ? `Stack of ${upcoming.length} habits, tap to expand`
            : undefined
        }
      >
        {/* Peek slivers behind the top card. Pointer-events are off so the
            click target is unambiguously the top card / wrapper. */}
        {Array.from({ length: peekCount }).map((_, i) => {
          const depth = i + 1;
          return (
            <div
              key={`peek-${depth}`}
              data-testid="stack-card-peek"
              aria-hidden="true"
              className="card"
              style={{
                position: "absolute",
                left: 8 * depth,
                right: 8 * depth,
                top: 8 * depth,
                bottom: -8 * depth,
                background: "var(--bg-elev)",
                borderRadius: 12,
                opacity: 1 - depth * 0.18,
                transform: `scale(${1 - depth * 0.02})`,
                zIndex: 0,
                pointerEvents: "none",
              }}
            />
          );
        })}
        <div style={{ position: "relative", zIndex: peekCount + 1 }}>
          {renderRow(top, 0, 1, () => {
            if (upcoming.length > 1) setExpanded(true);
            else onNavigate(top.id);
          })}
        </div>
        {upcoming.length > 1 && (
          <div
            className="muted mono"
            data-testid="stack-card-more"
            style={{
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textAlign: "center",
              padding: "6px 0 0",
              position: "relative",
              zIndex: peekCount + 2,
            }}
          >
            {`+${upcoming.length - 1} more in stack`}
          </div>
        )}
      </div>
    );
  }

  /**
   * Expanded view: render the top card and up to 2 upcoming cards. If more
   * upcoming habits remain in the chain, show a "+N more" indicator where N
   * excludes the cards already being displayed (the user requirement).
   */
  return (
    <div
      data-testid="stack-card-group"
      data-stack-expanded="true"
      data-stack-chain-length={upcoming.length}
      style={{ marginBottom: 8 }}
    >
      <AnimatePresence>
        {visible.map((h, i) => renderRow(h, i, visible.length, () => onNavigate(h.id)))}
      </AnimatePresence>

      {remaining > 0 && (
        <div
          className="muted mono"
          data-testid="stack-card-more"
          style={{
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textAlign: "center",
            padding: "6px 0",
          }}
        >
          {`+${remaining} more`}
        </div>
      )}

      <button
        className="btn btn-sm btn-ghost"
        style={{ display: "block", margin: "8px auto 0" }}
        onClick={() => setExpanded(false)}
      >
        Collapse stack
      </button>
    </div>
  );
}
