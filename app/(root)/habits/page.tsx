"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { IconPlus } from "@/components/Icons";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerContainer";
import { useStoreContext } from "@/components/StoreProvider";
import { formatScheduleLabel } from "@/lib/schedule";

type Filter = "all" | "morning" | "afternoon" | "evening";
type Sort = "streak" | "rate" | "newest" | "name";

const FILTERS: Filter[] = ["all", "morning", "afternoon", "evening"];

export default function HabitsPage() {
  const router = useRouter();
  const { habits, streak, longestStreak, completionRate } = useStoreContext();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("streak");

  const filtered = useMemo(() => {
    const list = habits.filter((habit) => filter === "all" || habit.time.toLowerCase() === filter);
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
  }, [completionRate, filter, habits, sort, streak]);

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
              {item[0].toUpperCase() + item.slice(1)}
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
        <div className="habit-list-header">
          {["Habit", "Cue -> response", "Streak", "Best", "30-day"].map((heading) => (
            <div
              key={heading}
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
              }}
            >
              {heading}
            </div>
          ))}
        </div>
        <StaggerContainer staggerDelay={0.04}>
          {filtered.map((habit) => {
            const activeStreak = streak(habit);
            const best = longestStreak(habit);
            const rate = Math.round(completionRate(habit) * 100);
            return (
              <StaggerItem key={habit.id}>
                <motion.div
                  className="click-row habit-list-row"
                  onClick={() => router.push(`/habits/${habit.id}`)}
                  whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="habit-list-field">
                    <div className="habit-list-label">Habit</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="habit-name">{habit.name}</div>
                      <div
                        className="muted mono"
                        style={{
                          fontSize: 10.5,
                          marginTop: 3,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        {habit.identity} · {formatScheduleLabel(habit.schedule)}
                      </div>
                    </div>
                  </div>
                  <div className="habit-list-field">
                    <div className="habit-list-label">Cue</div>
                    <div
                      className="muted"
                      style={{
                        fontSize: 12,
                        fontStyle: "italic",
                        fontFamily: "var(--serif)",
                        lineHeight: 1.35,
                      }}
                    >
                      &quot;{habit.cue.slice(0, 38)}
                      {habit.cue.length > 38 ? "..." : ""}&quot;
                    </div>
                  </div>
                  <div className="mono habit-list-field" style={{ fontSize: 13, fontWeight: 500 }}>
                    <div className="habit-list-label">Streak</div>
                    {activeStreak}d
                  </div>
                  <div className="mono muted habit-list-field" style={{ fontSize: 13 }}>
                    <div className="habit-list-label">Best</div>
                    {best}d
                  </div>
                  <div className="habit-list-field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="habit-list-label">30-day</div>
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
                        style={{ fontSize: 11, color: "var(--ink-3)", minWidth: 24, textAlign: "right" }}
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
    </motion.div>
  );
}
