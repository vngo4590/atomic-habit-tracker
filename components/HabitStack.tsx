"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";

import { TodayHabitCard } from "@/components/TodayHabitCard";
import { IconChevronDown, IconChevronUp } from "@/components/Icons";
import type { Habit } from "@/lib/types";

/**
 * Apple Wallet-style stacked card container for habits in a stack.
 *
 * Collapsed: the first (active) habit is fully visible; habits behind peek
 * out from below as thin strips. A badge shows how many more habits are in
 * the stack.
 *
 * Expanded: all habits fan out into fully-visible, individually-interactive
 * rows. A collapse button sits at the bottom.
 *
 * Even a single visible habit renders inside the stack container so the
 * grouping never disappears when a done root hides the rest of the chain.
 */

interface HabitStackProps {
  habits: Habit[];
  onCheck: (habit: Habit) => void;
  onNavigate: (id: string) => void;
  reduced?: boolean;
}

const PEEK = 10; // px — how much each behind card peeks out below
const GAP_EXPANDED = 12; // px — gap between cards when expanded
const TOP_PAD = 4; // px — prevents hover lift from clipping at container top
const BOTTOM_PAD = 4; // px — minimal breathing room when collapsed
const BOTTOM_PAD_EXPANDED = 28; // px — breathing room + collapse button space when expanded

export function HabitStack({ habits, onCheck, onNavigate, reduced }: HabitStackProps) {
  const [expanded, setExpanded] = useState(false);
  const frontRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(82); // generous default until measured

  // Measure the actual rendered height of the front card so the container
  // never clips or leaves awkward empty space.
  useLayoutEffect(() => {
    if (frontRef.current) {
      setCardHeight(frontRef.current.offsetHeight);
    }
  }, []);

  const behindCount = habits.length - 1;
  const hasMultiple = habits.length > 1;
  const overlap = cardHeight - PEEK;
  const collapsedHeight = TOP_PAD + cardHeight + behindCount * PEEK + BOTTOM_PAD;
  const expandedHeight =
    TOP_PAD +
    habits.length * cardHeight +
    (habits.length - 1) * GAP_EXPANDED +
    BOTTOM_PAD_EXPANDED;

  return (
    <motion.div
      layout
      className="habit-stack"
      style={{
        position: "relative",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        paddingTop: TOP_PAD,
        borderLeft: "3px solid var(--accent)",
      }}
      animate={{ height: expanded ? expandedHeight : collapsedHeight }}
      transition={{ type: "spring", stiffness: 350, damping: 32 }}
    >
      {habits.map((habit, i) => {
        const isFront = i === 0;
        const depth = i;

        return (
          <motion.div
            key={habit.id}
            animate={{
              marginTop: isFront ? 0 : expanded ? GAP_EXPANDED : -overlap,
              scale: expanded ? 1 : 1 - depth * 0.03,
              opacity: expanded ? 1 : isFront ? 1 : Math.max(0.25, 1 - depth * 0.35),
            }}
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
            style={{
              position: "relative",
              zIndex: habits.length - depth,
              transformOrigin: "top center",
            }}
          >
            <div ref={isFront ? frontRef : undefined}>
              <TodayHabitCard
                habit={habit}
                onCheck={() => onCheck(habit)}
                onNavigate={() => onNavigate(habit.id)}
                reduced={reduced}
              />
            </div>
          </motion.div>
        );
      })}

      {/* Expand / collapse controls — only when there are multiple habits */}
      {hasMultiple && (
        <AnimatePresence>
          {!expanded ? (
            <motion.button
              key="expand"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
              }}
              style={{
                position: "absolute",
                bottom: 6,
                right: 10,
                zIndex: habits.length + 20,
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                borderRadius: 999,
                background: "var(--bg-sunk)",
                border: "1px solid var(--rule-strong)",
                color: "var(--ink-3)",
                fontSize: 11,
                fontFamily: "var(--mono)",
                letterSpacing: "0.04em",
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              +{behindCount} more
              <IconChevronDown style={{ width: 12, height: 12 }} />
            </motion.button>
          ) : (
            <motion.button
              key="collapse"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(false);
              }}
              style={{
                position: "absolute",
                bottom: 8,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: habits.length + 20,
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 14px",
                borderRadius: 999,
                background: "var(--bg-sunk)",
                border: "1px solid var(--rule-strong)",
                color: "var(--ink-3)",
                fontSize: 11,
                fontFamily: "var(--mono)",
                letterSpacing: "0.04em",
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <IconChevronUp style={{ width: 12, height: 12 }} />
              Collapse
            </motion.button>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}
