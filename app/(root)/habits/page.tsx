"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { IconCheck, IconClose, IconPlus, IconSearch } from "@/components/Icons";
import { MoodCheckSheet } from "@/components/MoodCheckSheet";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerContainer";
import { useStoreContext } from "@/components/StoreProvider";
import { todayKey } from "@/lib/helpers";
import { clientLogger } from "@/lib/logger-client";
import { formatNextDayLabel, nextScheduledDateKey } from "@/lib/schedule";
import type { Habit } from "@/lib/types";

import styles from "./page.module.css";

type Filter = "all" | "done" | "upcoming";
type Sort = "streak" | "rate" | "newest" | "name";

const FILTERS: Filter[] = ["all", "done", "upcoming"];

const TAB_LABELS: Record<Filter, string> = {
  all: "All",
  done: "Done Habits",
  upcoming: "Upcoming Habits",
};

/**
 * HabitsPage — the All Habits library. Three filter tabs (All / Done /
 * Upcoming), search-by-name/identity/cue, four sort modes, and a row
 * per habit with the same check + name + streak + 30-day-progress
 * shape used on Today.
 */
export default function HabitsPage() {
  const router = useRouter();
  const { habits, streak, completionRate, toggleHabit, logCheckIn } = useStoreContext();
  const today = todayKey();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("streak");
  const [searchQuery, setSearchQuery] = useState("");
  const [moodHabit, setMoodHabit] = useState<Habit | null>(null);

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "habits" });
  }, []);

  // Apply filter -> search -> sort to derive the rendered list.
  const filtered = useMemo(() => {
    const list = habits.filter((habit) => {
      if (filter === "all") return true;
      const isDone = Boolean(habit.history[today]);
      if (filter === "done") return isDone;
      // upcoming = habits with a next scheduled day in the future
      const next = nextScheduledDateKey(today, habit.schedule);
      return next !== null;
    });
    const q = searchQuery.trim().toLowerCase();
    const searched = q
      ? list.filter(
          (habit) =>
            habit.name.toLowerCase().includes(q) ||
            habit.identity.toLowerCase().includes(q) ||
            habit.cue.toLowerCase().includes(q)
        )
      : list;
    return [...searched].sort((a, b) => {
      if (sort === "streak") return streak(b) - streak(a);
      if (sort === "rate") return completionRate(b) - completionRate(a);
      if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
      return a.name.localeCompare(b.name);
    });
  }, [completionRate, filter, habits, searchQuery, sort, streak, today]);

  // Clicking the check on a not-yet-done habit opens the mood sheet so
  // the user can capture their mood + a journal note alongside the vote.
  const handleCheck = (habit: Habit) => {
    const isDone = Boolean(habit.history[today]);
    if (!isDone) {
      setMoodHabit(habit);
    }
    toggleHabit(habit.id);
  };

  const handleFilterChange = (nextFilter: Filter) => {
    clientLogger.info("Habit filter changed", { page: "habits", filter: nextFilter });
    setFilter(nextFilter);
  };

  const handleSearchChange = (query: string) => {
    const hasQuery = Boolean(query.trim());
    const hadQuery = Boolean(searchQuery.trim());
    if (hasQuery !== hadQuery) {
      clientLogger.info("Habit search", { page: "habits", hasQuery });
    }
    setSearchQuery(query);
  };

  const handleSortChange = (nextSort: Sort) => {
    clientLogger.info("Habit sort changed", { page: "habits", sort: nextSort });
    setSort(nextSort);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="page-header">
        <div>
          <div className="eyebrow">Library</div>
          <h1 className="h1">
            All <em>habits</em>
          </h1>
        </div>
        <motion.button
          className="btn btn-primary"
          onClick={() => router.push("/habits/new")}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          <IconPlus className={styles.iconBtn} /> New habit
        </motion.button>
      </div>

      <div className="habit-library-toolbar">
        <div className="tabs habit-library-tabs">
          {FILTERS.map((item) => (
            <motion.button
              key={item}
              className={`tab ${filter === item ? "active" : ""}`}
              onClick={() => handleFilterChange(item)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              {TAB_LABELS[item]}
            </motion.button>
          ))}
        </div>
        <div className={styles.searchCluster}>
          <div className={styles.searchWrap}>
            <IconSearch className={styles.searchIcon} />
            <input
              className={`input ${styles.searchInput}`}
              placeholder="Search habits..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              // Search input width is dynamic (160px → 220px when active).
              // Passed via --search-w so the .searchInput class stays static.
              style={{ ["--search-w" as string]: searchQuery ? "220px" : "160px" }}
            />
            {searchQuery && (
              <button onClick={() => handleSearchChange("")} className={styles.searchClear}>
                <IconClose className={styles.searchClearIcon} />
              </button>
            )}
          </div>
          <div className="habit-sort-row">
            <span className="field-label">Sort</span>
            <select
              className="input habit-sort-select"
              value={sort}
              onChange={(event) => handleSortChange(event.target.value as Sort)}
            >
              <option value="streak">Active streak</option>
              <option value="rate">30-day rate</option>
              <option value="newest">Newest</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      <div className="habit-list">
        <StaggerContainer staggerDelay={0.04}>
          {filtered.map((habit) => {
            const activeStreak = streak(habit);
            const rate = Math.round(completionRate(habit) * 100);
            const nextDay = nextScheduledDateKey(today, habit.schedule);
            const nextLabel = formatNextDayLabel(nextDay);
            const isDone = Boolean(habit.history[today]);
            return (
              <StaggerItem key={habit.id}>
                <motion.div
                  className={`click-row habit-list-row ${styles.row}`}
                  onClick={() => router.push(`/habits/${habit.id}`)}
                  whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {/* Check */}
                  <div className="habit-list-field">
                    <motion.button
                      className={`check ${isDone ? "done" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCheck(habit);
                      }}
                      aria-label={isDone ? "Uncheck" : "Check"}
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    >
                      <IconCheck />
                    </motion.button>
                  </div>

                  {/* Habit */}
                  <div className="habit-list-field">
                    <div className={styles.nameInner}>
                      <div className="habit-name">{habit.name}</div>
                      <div className={`mono muted ${styles.captionMono}`}>
                        {habit.identity}
                        {nextLabel && <span className={styles.nextLabel}>· {nextLabel}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Streak */}
                  <div className="habit-list-field">
                    <div className={`mono ${styles.streak} ${activeStreak > 0 ? styles.streakActive : ""}`}>
                      {activeStreak}d
                    </div>
                  </div>

                  {/* 30-Day */}
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
              </StaggerItem>
            );
          })}
        </StaggerContainer>
        {habits.length === 0 && (
          <motion.div
            className={styles.empty}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="eyebrow">Empty library</div>
            <h2 className={`h2 ${styles.emptyTitle}`}>No habits in your account yet.</h2>
            <p className={`muted ${styles.emptyBody}`}>
              Create one habit to begin casting identity votes.
            </p>
            <motion.button
              className="btn btn-primary"
              onClick={() => router.push("/habits/new")}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              <IconPlus className={styles.iconBtn} /> New habit
            </motion.button>
          </motion.div>
        )}
        {habits.length > 0 && filtered.length === 0 && (
          <div className={`muted ${styles.noResults}`}>
            {searchQuery ? `No habits match "${searchQuery}".` : "No habits match this filter."}
          </div>
        )}
      </div>

      {moodHabit && (
        <MoodCheckSheet
          habit={moodHabit}
          dateKey={today}
          onClose={() => setMoodHabit(null)}
          onSave={(payload) => logCheckIn(moodHabit.id, payload)}
        />
      )}
    </motion.div>
  );
}
