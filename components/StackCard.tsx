"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";

import { getUpcomingStackHabits } from "@/lib/stack";
import type { Habit } from "@/lib/types";

interface StackCardProps {
  habit: Habit;
  habits: Habit[];
  today: string;
  children: React.ReactNode;
}

const FAN_GAP = 52;
const PEEK_GAP = 6;
const PEEK_HEIGHT = 14;
const FAN_HEIGHT = 48;

export function StackCard({ habit, habits, today, children }: StackCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const upcoming = useMemo(
    () => getUpcomingStackHabits(habit.id, habits, today),
    [habit.id, habits, today],
  );

  if (upcoming.length === 0) {
    return <>{children}</>;
  }

  const peekCount = Math.min(upcoming.length, 3);
  const defaultPaddingBottom = peekCount * (PEEK_GAP + PEEK_HEIGHT) + 16;
  const hoverPaddingBottom = peekCount * FAN_GAP + FAN_HEIGHT + 32;

  return (
    <motion.div
      style={{ position: "relative" }}
      animate={{
        paddingBottom: isHovered ? hoverPaddingBottom : defaultPaddingBottom,
        paddingTop: isHovered ? 6 : 2,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div style={{ position: "relative", zIndex: 10 }}>{children}</div>

      {/* Count badge showing remaining undone habits in the stack */}
      <div className="stack-count-badge">+{upcoming.length}</div>

      {/* Peek cards — thin strips in default state, full mini-cards on hover */}
      {upcoming.slice(0, 3).map((upcomingHabit, index) => (
        <motion.div
          key={upcomingHabit.id}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 5 - index,
          }}
          animate={{
            y: isHovered ? (index + 1) * FAN_GAP : (index + 1) * PEEK_GAP,
            height: isHovered ? FAN_HEIGHT : PEEK_HEIGHT,
            scale: 1 - (index + 1) * 0.025,
            opacity: isHovered ? 0.88 - index * 0.15 : 0.5 - index * 0.1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="stack-peek-card">
            <div className="stack-peek-bar" />
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  className="stack-peek-details"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12, delay: index * 0.03 }}
                >
                  <span className="stack-peek-emoji">{upcomingHabit.emoji}</span>
                  <span className="stack-peek-name">{upcomingHabit.name}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
