"use client";

import { useEffect, useState } from "react";
import { Plus, Sprout } from "lucide-react";
import dynamic from "next/dynamic";

import { useStoreContext } from "@/components/StoreProvider";
import { Button, Card, EmptyState, PageHeader, TabPanel, Tabs } from "@/components/ui";
import { todayKey } from "@/lib/helpers";
import { clientLogger } from "@/lib/logger-client";
import type { Habit } from "@/lib/types";

import { HabitListRow } from "./HabitListRow";
import { HabitsToolbar } from "./HabitsToolbar";
import { LIBRARY_FILTERS, filterHabits, isDoneOn, type LibraryFilter, type LibrarySort } from "./filter-habits";
import styles from "./HabitsLibrary.module.css";

// The mood sheet only appears after a check, so keep it out of the first load.
const MoodCheckSheet = dynamic(() => import("@/components/MoodCheckSheet").then((m) => m.MoodCheckSheet), {
  ssr: false,
});

/**
 * HabitsLibrary — the /habits page: every habit the user owns, filterable by
 * All / Done today / Upcoming, searchable by name, identity or cue, and
 * sortable. Checking a habit that isn't done yet opens the mood sheet so the
 * user can add a mood and a note alongside the vote.
 */
export function HabitsLibrary() {
  const { habits, streak, completionRate, toggleHabit, logCheckIn } = useStoreContext();
  const today = todayKey();
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [sort, setSort] = useState<LibrarySort>("streak");
  const [search, setSearch] = useState("");
  const [moodHabit, setMoodHabit] = useState<Habit | null>(null);

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "habits" });
  }, []);

  const visible = filterHabits(habits, { filter, search, sort, today, streak, completionRate });

  const handleCheck = (habit: Habit) => {
    if (!isDoneOn(habit, today)) setMoodHabit(habit);
    toggleHabit(habit.id);
  };

  const handleFilterChange = (next: string) => {
    clientLogger.info("Habit filter changed", { page: "habits", filter: next });
    setFilter(next as LibraryFilter);
  };

  const handleSearchChange = (query: string) => {
    if (Boolean(query.trim()) !== Boolean(search.trim())) {
      clientLogger.info("Habit search", { page: "habits", hasQuery: Boolean(query.trim()) });
    }
    setSearch(query);
  };

  const handleSortChange = (next: LibrarySort) => {
    clientLogger.info("Habit sort changed", { page: "habits", sort: next });
    setSort(next);
  };

  const newHabitButton = (
    <Button href="/habits/new" icon={<Plus size={18} strokeWidth={1.75} />}>
      New habit
    </Button>
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Library"
        title="All habits"
        subtitle="Every habit you're building, with its streak and 30-day rate."
        actions={habits.length > 0 ? newHabitButton : undefined}
      />

      {habits.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<Sprout size={24} strokeWidth={1.75} />}
            title="No habits in your account yet."
            action={newHabitButton}
          >
            Create one habit to begin casting identity votes.
          </EmptyState>
        </Card>
      ) : (
        <Tabs value={filter} onValueChange={handleFilterChange}>
          <HabitsToolbar
            search={search}
            sort={sort}
            onSearchChange={handleSearchChange}
            onSortChange={handleSortChange}
          />
          {LIBRARY_FILTERS.map((item) => (
            <TabPanel key={item.value} value={item.value}>
              {visible.length === 0 ? (
                <p className={styles.noResults} role="status">
                  {search.trim() ? `No habits match "${search}".` : "No habits match this filter."}
                </p>
              ) : (
                <Card as="section" padding="none" aria-label={`${item.label} habits`}>
                  <ul className={styles.list}>
                    {visible.map((habit) => (
                      <HabitListRow
                        key={habit.id}
                        habit={habit}
                        today={today}
                        isDone={isDoneOn(habit, today)}
                        activeStreak={streak(habit)}
                        rate={Math.round(completionRate(habit) * 100)}
                        onCheck={handleCheck}
                      />
                    ))}
                  </ul>
                </Card>
              )}
            </TabPanel>
          ))}
        </Tabs>
      )}

      {moodHabit ? (
        <MoodCheckSheet
          habit={moodHabit}
          dateKey={today}
          onClose={() => setMoodHabit(null)}
          onSave={(payload) => logCheckIn(moodHabit.id, payload)}
        />
      ) : null}
    </div>
  );
}
