"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";

import { IconCheck } from "@/components/Icons";
import { getChainFrom } from "@/lib/stack";
import { completionRate } from "@/lib/store";
import type { Habit } from "@/lib/types";

import styles from "./StackCardGroup.module.css";

/**
 * StackCardGroup — Apple-Wallet / Apple-Watch style stacked card for
 * habit chains on the Today screen.
 *
 * Behaviour requirements:
 *   - Always show the top card (the first undone habit forwarded into
 *     this component by the Today page).
 *   - When collapsed: show the top card with 1–2 "peek" slivers behind
 *     it so the user immediately sees a stack exists.
 *   - When expanded: show top card + up to 2 upcoming undone cards
 *     ("at most 2 upcoming"). If more remain, render a "+N more"
 *     indicator where N excludes the cards being displayed.
 *   - Use `getChainFrom(habit, habits)` so the visible sub-chain starts
 *     at the passed habit (not the chain's root), avoiding the
 *     mid-chain bug.
 *
 * Styling: dynamic values (z-index per row, peek depth/offset, progress
 * percentage) flow into the module CSS via inline CSS variables. No
 * literal CSS values appear inline.
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

  // Walk forward from the passed habit (which the Today page selects as
  // the first undone habit) and keep only undone entries — the user
  // wants to see habits still to be fulfilled.
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
        className={`card card-pad click-row habit-list-row ${styles.row} ${
          index < total - 1 ? styles.rowSpaced : ""
        }`}
        // Per-row z-index flows in as an inline variable so the module
        // class can read it without hard-coding stack depth.
        style={{ zIndex: total - index }}
        initial={expanded ? { opacity: 0, y: -8 } : false}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, delay: index * 0.05 }}
        onClick={onClick}
      >
        <div className={`habit-list-field ${styles.checkField}`}>
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
          <div className={styles.nameInner}>
            <div className="habit-name">{h.name}</div>
            <div className={`mono muted ${styles.identityLine}`}>
              {h.identity}
              {isDone && <span className={styles.identityDone}>· Done</span>}
            </div>
          </div>
        </div>

        <div className="habit-list-field">
          <div className={`mono ${styles.streak} ${activeStreak > 0 ? styles.streakActive : ""}`}>
            {activeStreak}d
          </div>
        </div>

        <div className="habit-list-field">
          <div className="habit-list-progress">
            <div className={styles.progressTrack}>
              <motion.div
                className={styles.progressFill}
                initial={{ width: 0 }}
                animate={{ width: `${rate}%` }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
            <span className={`mono ${styles.progressLabel}`}>{rate}%</span>
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
        className={styles.collapsed}
        // Peek padding flows in as a CSS variable so the static .collapsed
        // class doesn't need a different rule per peek count.
        style={{ ["--peek-pad" as string]: `${8 + peekCount * 8}px` }}
        onClick={() => {
          if (upcoming.length > 1) setExpanded(true);
        }}
        role={upcoming.length > 1 ? "button" : undefined}
        aria-label={
          upcoming.length > 1 ? `Stack of ${upcoming.length} habits, tap to expand` : undefined
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
              className={`card ${styles.peek}`}
              style={
                {
                  "--peek-depth": depth,
                  "--peek-offset": `${8 * depth}px`,
                } as React.CSSProperties
              }
            />
          );
        })}
        <div
          className={styles.top}
          style={{ ["--top-z" as string]: peekCount + 1 }}
        >
          {renderRow(top, 0, 1, () => {
            if (upcoming.length > 1) setExpanded(true);
            else onNavigate(top.id);
          })}
        </div>
        {upcoming.length > 1 && (
          <div
            className={`muted mono ${styles.moreLine}`}
            data-testid="stack-card-more"
            style={{ ["--more-z" as string]: peekCount + 2 }}
          >
            {`+${upcoming.length - 1} more in stack`}
          </div>
        )}
      </div>
    );
  }

  /**
   * Expanded view: render the top card and up to 2 upcoming cards. If
   * more upcoming habits remain in the chain, show a "+N more" indicator
   * where N excludes the cards already being displayed.
   */
  return (
    <div
      data-testid="stack-card-group"
      data-stack-expanded="true"
      data-stack-chain-length={upcoming.length}
      className={styles.expanded}
    >
      <AnimatePresence>
        {visible.map((h, i) => renderRow(h, i, visible.length, () => onNavigate(h.id)))}
      </AnimatePresence>

      {remaining > 0 && (
        <div className={`muted mono ${styles.moreLineExpanded}`} data-testid="stack-card-more">
          {`+${remaining} more`}
        </div>
      )}

      <button
        className={`btn btn-sm btn-ghost ${styles.collapseBtn}`}
        onClick={() => setExpanded(false)}
      >
        Collapse stack
      </button>
    </div>
  );
}
