"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { CompletionRing } from "@/components/CompletionRing";
import { IconCheck, IconClose, IconPlus, IconSearch } from "@/components/Icons";
import { MoodCheckSheet } from "@/components/MoodCheckSheet";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerContainer";
import { useStoreContext } from "@/components/StoreProvider";
import { dateAdd, fmt, todayKey } from "@/lib/helpers";
import { useMotionReduced } from "@/lib/hooks/useMotionReduced";
import { isScheduledForDate } from "@/lib/schedule";
import { completionRate } from "@/lib/store";
import type { Habit } from "@/lib/types";

export default function TodayPage() {
  const router = useRouter();
  const store = useStoreContext();
  const reduced = useMotionReduced();
  const { habits, toggleHabit, logCheckIn, streak } = store;
  const [today] = useState(() => todayKey());
  const [moodHabit, setMoodHabit] = useState<Habit | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const scheduledToday = habits.filter((habit) => isScheduledForDate(today, habit.schedule));
  const scheduledUndone = scheduledToday.filter((habit) => !habit.history[today]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return habits.filter(
      (habit) =>
        habit.name.toLowerCase().includes(q) ||
        habit.identity.toLowerCase().includes(q) ||
        habit.cue.toLowerCase().includes(q)
    );
  }, [habits, searchQuery]);
  const doneToday = habits.filter((habit) => habit.history[today]).length;
  const pct = habits.length ? Math.round((doneToday / habits.length) * 100) : 0;
  const hour = new Date().getHours();
  const greet = hour < 5 ? "Late night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const last14 = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const key = dateAdd(today, -i);
      const done = habits.filter((habit) => habit.history[key]).length;
      days.push({ key, done, total: habits.length });
    }
    return days;
  }, [habits, today]);

  const votes = useMemo(() => {
    const tally = new Map<string, number>();
    habits.forEach((habit) => {
      if (habit.history[today]) {
        tally.set(habit.identity, (tally.get(habit.identity) ?? 0) + 1);
      }
    });
    return Array.from(tally.entries());
  }, [habits, today]);

  const topHabit = [...habits].sort((a, b) => streak(b) - streak(a))[0];

  return (
    <div>
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      >
        <div>
          <div className="eyebrow">
            {greet} · {fmt.long(today)}
          </div>
          <h1 className="h1">
            {doneToday === habits.length && habits.length > 0 ? (
              <>
                A clean sweep. <em>Vote cast.</em>
              </>
            ) : doneToday === 0 ? (
              <>
                Start with <em>one small thing.</em>
              </>
            ) : (
              <>
                You&apos;re <em>{pct}%</em> through today.
              </>
            )}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <IconSearch style={{ width: 13, height: 13, position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", pointerEvents: "none" }} />
            <input
              className="input"
              placeholder="Search habits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 30, height: 34, fontSize: 13, width: searchQuery ? 220 : 160 }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--ink-3)" }}
              >
                <IconClose style={{ width: 12, height: 12 }} />
              </button>
            )}
          </div>
          <motion.button
            className="btn btn-sm btn-primary"
            onClick={() => router.push("/habits/new")}
            whileHover={reduced ? undefined : { y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <IconPlus style={{ width: 13, height: 13 }} />
            New habit
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 18, marginBottom: 32 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.div
          className="card card-pad"
          style={{ display: "flex", gap: 20, alignItems: "center" }}
          whileHover={reduced ? undefined : { y: -2, boxShadow: "var(--shadow-md)" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <CompletionRing pct={pct} />
          <div>
            <div className="eyebrow">Today</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 32, lineHeight: 1, marginTop: 4 }}>
              {doneToday}
              <span style={{ color: "var(--ink-3)" }}>/{habits.length}</span>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {doneToday === 0
                ? "Nothing checked yet"
                : doneToday === habits.length
                  ? "All done - well done."
                  : `${habits.length - doneToday} habits remaining`}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card card-pad"
          whileHover={reduced ? undefined : { y: -2, boxShadow: "var(--shadow-md)" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="eyebrow">Longest active streak</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 32, lineHeight: 1 }}>
              {Math.max(0, ...habits.map(streak))}
            </div>
            <div className="muted mono" style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              days
            </div>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {topHabit ? `${topHabit.name} - keep it warm.` : "-"}
          </div>
        </motion.div>

        <motion.div
          className="card card-pad"
          whileHover={reduced ? undefined : { y: -2, boxShadow: "var(--shadow-md)" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="eyebrow">Last 14 days</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 48, marginTop: 10 }}>
            {last14.map((day, index) => {
              const height = day.total ? (day.done / day.total) * 100 : 0;
              const isToday = index === last14.length - 1;
              return (
                <div
                  key={day.key}
                  style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
                >
                  <motion.div
                    style={{
                      height: `${Math.max(4, height)}%`,
                      background: isToday ? "var(--accent)" : height > 50 ? "var(--ink-2)" : "var(--rule-strong)",
                      borderRadius: 2,
                    }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 + index * 0.03, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
              );
            })}
          </div>
          <div
            className="muted mono"
            style={{ fontSize: 10, letterSpacing: "0.06em", marginTop: 8, display: "flex", justifyContent: "space-between" }}
          >
            <span>2 WEEKS AGO</span>
            <span>TODAY</span>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="card card-pad"
        style={{ marginBottom: 32, background: "var(--bg-sunk)", borderStyle: "dashed" }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 32, alignItems: "center" }}>
          <div>
            <div className="eyebrow">Today, you&apos;re voting for</div>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: 22,
                fontStyle: "italic",
                marginTop: 6,
                color: "var(--ink-2)",
                lineHeight: 1.4,
              }}
            >
              {store.identity.statement}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Today&apos;s votes by identity
            </div>
            {votes.length === 0 ? (
              <div className="muted" style={{ fontStyle: "italic", fontFamily: "var(--serif)", fontSize: 14 }}>
                No votes cast yet - check off a habit below.
              </div>
            ) : (
              <StaggerContainer style={{ display: "flex", flexDirection: "column", gap: 6 }} staggerDelay={0.04}>
                {votes.map(([identity, count]) => (
                  <StaggerItem key={identity}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13 }}>
                      <span style={{ fontFamily: "var(--serif)", fontStyle: "italic" }}>
                        I am <span style={{ color: "var(--accent)" }}>{identity}</span>
                      </span>
                      <span className="mono" style={{ fontSize: 11.5 }}>
                        +{count}
                      </span>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </div>
        </div>
      </motion.div>

      {searchQuery && searchResults.length > 0 && (
        <motion.section
          style={{ marginBottom: 24 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <h2 className="h3">Search results</h2>
            <span
              className="muted mono"
              style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              {searchResults.length} found
            </span>
          </div>
          <div className="habit-list">
            <StaggerContainer staggerDelay={0.04}>
              {searchResults.map((habit) => {
                const activeStreak = streak(habit);
                const rate = Math.round(completionRate(habit) * 100);
                const isDone = Boolean(habit.history[today]);
                const isScheduled = isScheduledForDate(today, habit.schedule);
                return (
                  <StaggerItem key={habit.id}>
                    <motion.div
                      className="click-row habit-list-row"
                      style={{
                        gridTemplateColumns: "44px minmax(0, 1fr) 80px 140px",
                        alignItems: "center",
                      }}
                      onClick={() => router.push(`/habits/${habit.id}`)}
                      whileHover={reduced ? undefined : { y: -2, boxShadow: "var(--shadow-md)" }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <div className="habit-list-field" style={{ alignItems: "center" }}>
                        <motion.button
                          className={`check ${isDone ? "done" : ""}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!isDone) setMoodHabit(habit);
                            toggleHabit(habit.id);
                          }}
                          aria-label={isDone ? "Uncheck" : "Check"}
                          whileTap={{ scale: 0.85 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        >
                          <IconCheck />
                        </motion.button>
                      </div>

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
                            {!isScheduled && <span style={{ marginLeft: 8, color: "var(--ink-3)" }}>· Not today</span>}
                            {isDone && <span style={{ marginLeft: 8, color: "var(--accent)" }}>· Done</span>}
                          </div>
                        </div>
                      </div>

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
          </div>
        </motion.section>
      )}

      {searchQuery && searchResults.length === 0 && (
        <motion.div
          className="card card-pad"
          style={{ textAlign: "center", padding: "42px 20px", marginBottom: 24 }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="eyebrow">No results</div>
          <h2 className="h2" style={{ marginTop: 8 }}>
            No habits match &quot;{searchQuery}&quot;.
          </h2>
        </motion.div>
      )}

      {!searchQuery && scheduledUndone.length > 0 && (
        <motion.section
          style={{ marginBottom: 24 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <h2 className="h3">Habits</h2>
            <span
              className="muted mono"
              style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              {scheduledUndone.length} remaining
            </span>
          </div>
          <div className="habit-list">
            <StaggerContainer staggerDelay={0.04}>
              {scheduledUndone.map((habit) => {
                const activeStreak = streak(habit);
                const rate = Math.round(completionRate(habit) * 100);
                return (
                  <StaggerItem key={habit.id}>
                    <motion.div
                      className="click-row habit-list-row"
                      style={{
                        gridTemplateColumns: "44px minmax(0, 1fr) 80px 140px",
                        alignItems: "center",
                      }}
                      onClick={() => router.push(`/habits/${habit.id}`)}
                      whileHover={reduced ? undefined : { y: -2, boxShadow: "var(--shadow-md)" }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <div className="habit-list-field" style={{ alignItems: "center" }}>
                        <motion.button
                          className="check"
                          onClick={(event) => {
                            event.stopPropagation();
                            setMoodHabit(habit);
                            toggleHabit(habit.id);
                          }}
                          aria-label="Check"
                          whileTap={{ scale: 0.85 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        >
                          <IconCheck />
                        </motion.button>
                      </div>

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
                          </div>
                        </div>
                      </div>

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
          </div>
        </motion.section>
      )}

      {!searchQuery && habits.length > 0 && scheduledUndone.length === 0 && (
        <motion.div
          className="card card-pad"
          style={{ textAlign: "center", padding: "42px 20px", marginBottom: 24 }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="eyebrow">
            {scheduledToday.length === 0 ? "Nothing scheduled" : "All caught up"}
          </div>
          <h2 className="h2" style={{ marginTop: 8 }}>
            {scheduledToday.length === 0
              ? "No habits scheduled for today."
              : "Every scheduled habit is complete."}
          </h2>
          <p className="muted" style={{ margin: "10px auto 0", maxWidth: 460, lineHeight: 1.5 }}>
            {scheduledToday.length === 0
              ? "Enjoy your free time or browse your habit library."
              : "Great work casting your identity votes today."}
          </p>
        </motion.div>
      )}

      {habits.length === 0 && (
        <motion.div
          className="card card-pad"
          style={{ textAlign: "center", padding: "42px 20px" }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="eyebrow">No habits yet</div>
          <h2 className="h2" style={{ marginTop: 8 }}>
            Design your first daily vote.
          </h2>
          <p className="muted" style={{ margin: "10px auto 18px", maxWidth: 460, lineHeight: 1.5 }}>
            Start with one small behavior tied to a clear identity.
          </p>
          <motion.button
            className="btn btn-primary"
            onClick={() => router.push("/habits/new")}
            whileHover={reduced ? undefined : { y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <IconPlus style={{ width: 13, height: 13 }} />
            Create habit
          </motion.button>
        </motion.div>
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
