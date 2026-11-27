"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Flame } from "lucide-react";
import Link from "next/link";
import type { ReactNode, Ref } from "react";

import type { Habit } from "@/lib/types";

import styles from "./HabitCheckRow.module.css";

interface RowBase {
  habit: Habit;
  /** Whether today's check-in already exists. */
  done: boolean;
  /** Current streak in days (schedule-aware, from the store). */
  streak: number;
  /** Tap on the circle: check in (or undo when already done). */
  onToggle: (habit: Habit) => void;
  /** Extra inline labels after the identity line (e.g. "Not today"). */
  meta?: ReactNode;
}

/** The row body links to the habit's detail page... */
interface RowAsLink extends RowBase {
  href: string;
  onActivate?: never;
}

/** ...or is a button with its own action (e.g. "expand this stack"). */
interface RowAsButton extends RowBase {
  href?: never;
  onActivate: () => void;
  /** aria-expanded for disclosure-style rows. */
  expanded?: boolean;
  /** id of an element that describes what activating does. */
  describedBy?: string;
  bodyRef?: Ref<HTMLButtonElement>;
}

export type HabitCheckRowProps = RowAsLink | RowAsButton;

/** Button variant of the row body (destructured so refs stay out of render reads). */
function RowBodyButton({
  bodyRef,
  onActivate,
  expanded,
  describedBy,
  children,
}: Pick<RowAsButton, "bodyRef" | "onActivate" | "expanded" | "describedBy"> & {
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      ref={bodyRef}
      className={styles.body}
      onClick={onActivate}
      aria-expanded={expanded}
      aria-describedby={describedBy}
    >
      {children}
    </button>
  );
}

/** Spring used for the check circle press — tactile but quick. */
const TAP_SPRING = { type: "spring", stiffness: 500, damping: 22 } as const;

/**
 * HabitCheckRow — one habit on the Today screen.
 *
 * Left: a 44px check-in circle (one tap, optimistic via the store, spring
 * press feedback unless reduced motion is on). Middle: name + the identity it
 * votes for. Right: the current streak. The body is a real link (or button),
 * a sibling of the check button so the two controls never nest.
 */
export function HabitCheckRow(props: HabitCheckRowProps) {
  const { habit, done, streak, onToggle, meta } = props;
  const reduceMotion = useReducedMotion();

  const body = (
    <>
      <span className={styles.name}>{habit.name}</span>
      <span className={styles.identityLine}>
        <span className={styles.identity}>{habit.identity}</span>
        {meta}
      </span>
    </>
  );

  return (
    <div className={styles.row} data-testid="habit-row" data-done={done ? "true" : "false"}>
      <motion.button
        type="button"
        className={`${styles.check} ${done ? styles.checkDone : ""}`}
        aria-label={done ? `Mark ${habit.name} not done` : `Mark ${habit.name} done`}
        onClick={() => onToggle(habit)}
        whileTap={reduceMotion ? undefined : { scale: 0.85 }}
        transition={TAP_SPRING}
      >
        <span className={styles.circle} aria-hidden="true">
          <Check size={16} strokeWidth={2.5} />
        </span>
      </motion.button>

      {props.href !== undefined ? (
        <Link href={props.href} className={styles.body}>
          {body}
        </Link>
      ) : (
        <RowBodyButton
          bodyRef={props.bodyRef}
          onActivate={props.onActivate}
          expanded={props.expanded}
          describedBy={props.describedBy}
        >
          {body}
        </RowBodyButton>
      )}

      <span className={`${styles.streak} ${streak > 0 ? styles.streakActive : ""}`}>
        <Flame size={16} aria-hidden="true" className={styles.flame} />
        {streak}
        <span aria-hidden="true">d</span>
        <span className={styles.srOnly}> day streak</span>
      </span>
    </div>
  );
}
