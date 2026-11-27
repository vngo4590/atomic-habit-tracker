"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui";
import { getChainFrom } from "@/features/stacks";
import type { Habit } from "@/lib/types";

import { HabitCheckRow } from "./HabitCheckRow";
import styles from "./StackCardGroup.module.css";

/** Expanded view shows the top card plus at most two upcoming links. */
const MAX_VISIBLE = 3;

export interface StackCardGroupProps {
  /** First undone habit of the chain, chosen by the Today page. */
  habit: Habit;
  habits: Habit[];
  onCheck: (habit: Habit) => void;
  streak: (habit: Habit) => number;
  today?: string;
}

/**
 * StackCardGroup — a habit chain on Today, shown as a wallet-style stack.
 *
 * Collapsed: the top card with 1–2 "peek" slivers behind it and a
 * "+N more in stack" hint; tapping the card body expands. Expanded: the top
 * card plus up to 2 upcoming undone links (each linking to its detail page),
 * a "+N more" line for the rest, and a "Collapse stack" button.
 *
 * The visible sub-chain starts at `habit` (via `getChainFrom`), not at the
 * chain root, and skips links already done today. Focus moves to the first
 * card on expand and back to the stack on collapse, so keyboard users never
 * lose their place.
 */
export function StackCardGroup({ habit, habits, onCheck, streak, today }: StackCardGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReducedMotion();
  const moreId = useId();
  const expandedRef = useRef<HTMLDivElement>(null);
  const topBodyRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef(false);

  const upcoming = useMemo(() => {
    const subChain = getChainFrom(habit, habits);
    if (!today) return subChain;
    return subChain.filter((h) => !h.history[today]);
  }, [habit, habits, today]);

  // Move focus only after a user-initiated expand/collapse (not on mount).
  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    if (expanded) expandedRef.current?.querySelector<HTMLElement>("a")?.focus();
    else topBodyRef.current?.focus();
  }, [expanded]);

  const toggle = (next: boolean) => {
    pendingFocus.current = true;
    setExpanded(next);
  };

  const isDone = (h: Habit) => Boolean(today ? h.history[today] : Object.keys(h.history).length > 0);
  const top = upcoming[0];
  if (!top) return null;

  const visible = upcoming.slice(0, MAX_VISIBLE);
  const remaining = Math.max(upcoming.length - MAX_VISIBLE, 0);
  const peekCount = Math.min(Math.max(upcoming.length - 1, 0), 2);
  const isChain = upcoming.length > 1;

  if (!expanded) {
    return (
      <div
        data-testid="stack-card-group"
        data-stack-expanded="false"
        data-stack-chain-length={upcoming.length}
      >
        <div className={styles.deck} data-peeks={peekCount}>
          {Array.from({ length: peekCount }, (_, i) => (
            <div
              key={`peek-${i + 1}`}
              data-testid="stack-card-peek"
              data-depth={i + 1}
              aria-hidden="true"
              className={styles.peek}
            />
          ))}
          <div className={styles.top} data-testid="stack-card" data-stack-card-position={0}>
            {isChain ? (
              <HabitCheckRow
                habit={top}
                done={isDone(top)}
                streak={streak(top)}
                onToggle={onCheck}
                onActivate={() => toggle(true)}
                expanded={false}
                describedBy={moreId}
                bodyRef={topBodyRef}
              />
            ) : (
              <HabitCheckRow
                habit={top}
                done={isDone(top)}
                streak={streak(top)}
                onToggle={onCheck}
                href={`/habits/${top.id}`}
              />
            )}
          </div>
        </div>
        {isChain && (
          <p id={moreId} className={styles.moreLine} data-testid="stack-card-more">
            {`+${upcoming.length - 1} more in stack`}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={expandedRef}
      data-testid="stack-card-group"
      data-stack-expanded="true"
      data-stack-chain-length={upcoming.length}
      className={styles.expanded}
    >
      <AnimatePresence initial={false}>
        {visible.map((h, i) => (
          <motion.div
            key={h.id}
            data-testid="stack-card"
            data-stack-card-position={i}
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.22, delay: reduceMotion ? 0 : i * 0.05 }}
          >
            <HabitCheckRow
              habit={h}
              done={isDone(h)}
              streak={streak(h)}
              onToggle={onCheck}
              href={`/habits/${h.id}`}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {remaining > 0 && (
        <p className={styles.moreLine} data-testid="stack-card-more">
          {`+${remaining} more`}
        </p>
      )}

      <Button variant="ghost" size="sm" className={styles.collapseBtn} onClick={() => toggle(false)}>
        Collapse stack
      </Button>
    </div>
  );
}
