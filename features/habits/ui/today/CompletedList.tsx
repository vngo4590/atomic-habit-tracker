"use client";

import { Check, ChevronRight, Undo2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui";
import type { Habit } from "@/lib/types";

import styles from "./CompletedList.module.css";

export interface CompletedListProps {
  /** Habits scheduled today that already have today's check-in. */
  habits: Habit[];
  /** Reverts today's check-in (the store's optimistic toggle). */
  onUndo: (habit: Habit) => void;
  /** Start expanded (used when everything is done, so the list isn't hidden). */
  defaultOpen?: boolean;
}

/**
 * CompletedList — the quiet "Completed (n)" disclosure under the focus list.
 *
 * Checking a habit moves it here instead of making it vanish, and each entry
 * offers Undo. Built on native <details>/<summary>, so it is keyboard- and
 * screen-reader-accessible with no extra JS.
 */
export function CompletedList({ habits, onUndo, defaultOpen = false }: CompletedListProps) {
  if (habits.length === 0) return null;

  return (
    <details className={styles.completed} open={defaultOpen || undefined} data-testid="completed-list">
      <summary className={styles.summary}>
        <ChevronRight size={18} aria-hidden="true" className={styles.chevron} />
        <span>Completed ({habits.length})</span>
      </summary>
      <ul className={styles.list}>
        {habits.map((habit) => (
          <li key={habit.id} className={styles.item}>
            <span className={styles.tick} aria-hidden="true">
              <Check size={14} strokeWidth={2.5} />
            </span>
            <Link href={`/habits/${habit.id}`} className={styles.name}>
              {habit.name}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              icon={<Undo2 size={16} />}
              aria-label={`Undo ${habit.name}`}
              onClick={() => onUndo(habit)}
            >
              Undo
            </Button>
          </li>
        ))}
      </ul>
    </details>
  );
}
