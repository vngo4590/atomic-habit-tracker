"use client";

import { X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Badge, IconButton } from "@/components/ui";
import { clientLogger } from "@/lib/logger-client";
import type { Habit } from "@/lib/types";

import { isScheduledForDate } from "../../model/schedule";
import { HabitCheckRow } from "./HabitCheckRow";
import { searchHabits } from "./today-model";
import styles from "./TodaySearch.module.css";

export interface TodaySearchProps {
  habits: Habit[];
  today: string;
  streak: (habit: Habit) => number;
  onToggle: (habit: Habit) => void;
  /** Close and hand focus back to the header's search button. */
  onClose: () => void;
}

/**
 * TodaySearch — the secondary search panel revealed by the header's search
 * button. Searches every habit (not just today's) by name, identity or cue;
 * results can be checked in directly. Esc or the × button closes it.
 */
export function TodaySearch({ habits, today, streak, onToggle, onClose }: TodaySearchProps) {
  const [query, setQuery] = useState("");
  const hadQuery = useRef(false);
  const results = useMemo(() => searchHabits(habits, query), [habits, query]);
  const trimmed = query.trim();

  const handleChange = (next: string) => {
    // Log only transitions between "searching" and "not searching", never
    // the query itself (it may contain personal text).
    const hasQuery = Boolean(next.trim());
    if (hasQuery !== hadQuery.current) {
      hadQuery.current = hasQuery;
      clientLogger.info("Habit search", { page: "today", hasQuery });
    }
    setQuery(next);
  };

  return (
    <section id="today-search" className={styles.panel} aria-label="Search habits">
      <div className={styles.field}>
        <input
          type="search"
          className={styles.input}
          placeholder="Search habits..."
          aria-label="Search all habits"
          value={query}
          autoFocus
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
          }}
        />
        <IconButton icon={<X />} aria-label="Close search" onClick={onClose} />
      </div>

      {trimmed && results.length > 0 && (
        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <h2 className={styles.heading}>Search results</h2>
            <span className={styles.count} aria-live="polite">
              {results.length} found
            </span>
          </div>
          <ul className={styles.list}>
            {results.map((habit) => {
              const done = Boolean(habit.history[today]);
              return (
                <li key={habit.id}>
                  <HabitCheckRow
                    habit={habit}
                    done={done}
                    streak={streak(habit)}
                    onToggle={onToggle}
                    href={`/habits/${habit.id}`}
                    meta={
                      <>
                        {!isScheduledForDate(today, habit.schedule) && <Badge>Not today</Badge>}
                        {done && <Badge tone="primary">Done</Badge>}
                      </>
                    }
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {trimmed && results.length === 0 && (
        <p className={styles.empty} role="status">
          No habits match &quot;{trimmed}&quot;.
        </p>
      )}
    </section>
  );
}
