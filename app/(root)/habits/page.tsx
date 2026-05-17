"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { IconCheck, IconPlus } from "@/components/Icons";
import { MoodCheckSheet } from "@/components/MoodCheckSheet";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerContainer";
import { useStoreContext } from "@/components/StoreProvider";
import { todayKey } from "@/lib/helpers";
import { formatNextDayLabel, nextScheduledDateKey } from "@/lib/schedule";
import type { Habit } from "@/lib/types";

type Filter = "all" | "done" | "upcoming";
type Sort = "streak" | "rate" | "newest" | "name";

const FILTERS: Filter[] = ["all", "done", "upcoming"];

const TAB_LABELS: Record<Filter, string> = {
  all: "All",
  done: "Done Habits",
  upcoming: "Upcoming Habits",
};

export default function HabitsPage() {
  const router = useRouter();
  const { habits, streak, completionRate, toggleHabit, logCheckIn } = useStoreContext();
  const today = todayKey();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("streak");
  const [moodHabit, setMoodHabit] = useState<Habit | null>(null);

  const filtered = useMemo(() => {
    const list = habits.filter((habit) => {
      if (filter === "all") {
        return true;
      }
      const isDone = Boolean(habit.history[today]);
      if (filter === "done") {
        return isDone;
      }
      // upcoming = habits with a next scheduled day in the future
      const next = nextScheduledDateKey(today, habit.schedule);
      return next !== null;
    });
    return [...list].sort((a, b) => {
      if (sort === "streak") {
        return streak(b) - streak(a);
      }
      if (sort === "rate") {
        return completionRate(b) - completionRate(a);
      }
      if (sort === "newest") {
        return b.createdAt.localeCompare(a.createdAt);
      }
      return a.name.localeCompare(b.name);
    });
  }, [completionRate, filter, habits, sort, streak, today]);

  const handleCheck = (habit: Habit) => {
    const isDone = Boolean(habit.history[today]);
    if (!isDone) {
      setMoodHabit(habit);
    }
    toggleHabit(habit.id);
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
          <IconPlus style={{ width: 13, height: 13 }} /> New habit
        </motion.button>
      </div>

      <div className="habit-library-toolbar">
        <div className="tabs habit-library-tabs">
          {FILTERS.map((item) => (
            <motion.button
              key={item}
              className={`tab ${filter === item ? "active" : ""}`}
              onClick={() => setFilter(item)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              {TAB_LABELS[item]}
            </motion.button>
          ))}
        </div>
        <div className="habit-sort-row">
          <span className="field-label">Sort</span>
          <select
            className="input habit-sort-select"
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
          >
            <option value="streak">Active streak</option>
            <option value="rate">30-day rate</option>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
          </select>
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
                  className="click-row habit-list-row"
                  style={{
                    gridTemplateColumns: "44px minmax(0, 1fr) 80px 140px",
                    alignItems: "center",
                  }}
                  onClick={() => router.push(`/habits/${habit.id}`)}
                  whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {/* Check */}
                  <div className="habit-list-field" style={{ alignItems: "center" }}>
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
                    <div style={{ minWidth: 0 }}>
                      <div className="habit-name">{habit.name}</div>
                      <div
                        className="mono muted"
                        style={{
                          fontSize: 10.5,
                          marginTop: 3,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        {habit.identity}
                        {nextLabel && (
                          <span style={{ marginLeft: 8, color: "var(--ink-3)" }}>· {nextLabel}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Streak */}
                  <div className="habit-list-field">
                    <div
                      className="mono"
                      style={{
                        fontSize: 16,
                        fontWeight: 500,
                        color: activeStreak > 0 ? "var(--ink)" : "var(--ink-3)",
                      }}
                    >
                      {activeStreak}d
                    </div>
                  </div>

                  {/* 30-Day */}
                  <div className="habit-list-field">
                    <div className="habit-list-progress">
                      <div
                        style={{
                          flex: 1,
                          height: 4,
                          background: "var(--bg-sunk)",
                          borderRadius: 99,
                          overflow: "hidden",
                        }}
                      >
                        <motion.div
                          style={{ height: "100%", background: "var(--accent)" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${rate}%` }}
                          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                        />
                      </div>
                      <span
                        className="mono"
                        style={{
                          fontSize: 11,
                          color: "var(--ink-3)",
                          minWidth: 28,
                          textAlign: "right",
                        }}
                      >
                        {rate}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
        {habits.length === 0 && (
          <motion.div
            style={{ padding: "42px 22px", textAlign: "center" }}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="eyebrow">Empty library</div>
            <h2 className="h2" style={{ marginTop: 8 }}>
              No habits in your account yet.
            </h2>
            <p className="muted" style={{ margin: "10px auto 18px", maxWidth: 420, lineHeight: 1.5 }}>
              Create one habit to begin casting identity votes.
            </p>
            <motion.button
              className="btn btn-primary"
              onClick={() => router.push("/habits/new")}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              <IconPlus style={{ width: 13, height: 13 }} /> New habit
            </motion.button>
          </motion.div>
        )}
        {habits.length > 0 && filtered.length === 0 && (
          <div className="muted" style={{ padding: "28px 22px", textAlign: "center" }}>
            No habits match this filter.
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
