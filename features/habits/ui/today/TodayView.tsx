"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { MoodCheckSheet } from "@/components/MoodCheckSheet";
import { useStoreContext } from "@/components/StoreProvider";
import { todayKey } from "@/lib/helpers";
import { clientLogger } from "@/lib/logger-client";
import type { Habit } from "@/lib/types";

import { CompletedList } from "./CompletedList";
import { FocusList } from "./FocusList";
import { IdentityVotes } from "./IdentityVotes";
import { AllDoneState, FirstRunOnboarding, RestDayState } from "./TodayEmptyStates";
import { TodayHeader } from "./TodayHeader";
import { TodayInsights } from "./TodayInsights";
import { TodaySearch } from "./TodaySearch";
import styles from "./TodayView.module.css";
import { useTodayData } from "./useTodayData";

export interface TodayViewProps {
  /** First name for the greeting (from the signed-in user). */
  userName?: string | null;
}

/**
 * TodayView — the home screen (`/`).
 *
 * Order matters on a phone: compact header → today's focus list (the one
 * thing to do) → "Completed (n)" with undo → quieter insights. Empty data
 * gets a purpose-built state instead: first-run onboarding (no habits), a
 * rest day (nothing scheduled) or a calm "all done".
 *
 * Check-ins go through the store's optimistic `toggleHabit` (instant UI,
 * rollback + toast on failure); checking a habit in opens the mood sheet.
 */
export function TodayView({ userName }: TodayViewProps) {
  const { habits, toggleHabit, logCheckIn, streak, identity } = useStoreContext();
  const [today] = useState(() => todayKey());
  const [moodHabit, setMoodHabit] = useState<Habit | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const data = useTodayData(habits, streak, today);

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "today" });
  }, []);

  /** Check in (and ask for mood) or undo, depending on today's state. */
  const toggle = useCallback(
    (habit: Habit) => {
      if (!habit.history[today]) setMoodHabit(habit);
      toggleHabit(habit.id);
    },
    [toggleHabit, today],
  );

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    searchButtonRef.current?.focus();
  }, []);

  const hasHabits = habits.length > 0;
  const { scheduledToday, scheduledUndone, doneToday } = data;

  let main: ReactNode;
  if (!hasHabits) main = <FirstRunOnboarding />;
  else if (scheduledToday.length === 0) main = <RestDayState next={data.nextUp} />;
  else if (scheduledUndone.length === 0) main = <AllDoneState count={doneToday.length} />;
  else
    main = (
      <FocusList
        items={data.items}
        remaining={scheduledUndone.length}
        habits={habits}
        today={today}
        streak={streak}
        onCheck={toggle}
      />
    );

  return (
    <div className={styles.page} data-testid="today-view">
      <TodayHeader
        userName={userName}
        today={today}
        done={doneToday.length}
        total={scheduledToday.length}
        canSearch={hasHabits}
        searchOpen={searchOpen}
        onToggleSearch={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
        searchButtonRef={searchButtonRef}
      />

      {searchOpen && hasHabits && (
        <TodaySearch habits={habits} today={today} streak={streak} onToggle={toggle} onClose={closeSearch} />
      )}

      {main}

      <CompletedList
        habits={doneToday}
        onUndo={(habit) => toggleHabit(habit.id)}
        defaultOpen={scheduledToday.length > 0 && scheduledUndone.length === 0}
      />

      {hasHabits && (
        <div className={styles.secondary}>
          <TodayInsights longest={data.longest} topHabit={data.topHabit} last14={data.last14} />
          <IdentityVotes statement={identity.statement} votes={data.votes} />
        </div>
      )}

      {moodHabit && (
        <MoodCheckSheet
          habit={moodHabit}
          dateKey={today}
          onClose={() => setMoodHabit(null)}
          onSave={(payload) => logCheckIn(moodHabit.id, payload)}
        />
      )}
    </div>
  );
}
