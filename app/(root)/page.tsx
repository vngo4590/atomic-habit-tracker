"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { CompletionRing } from "@/components/CompletionRing";
import { IconCheck, IconClose, IconPlus, IconSearch } from "@/components/Icons";
import { MoodCheckSheet } from "@/components/MoodCheckSheet";
import { StackCardGroup } from "@/components/StackCardGroup";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerContainer";
import { useStoreContext } from "@/components/StoreProvider";
import { dateAdd, fmt, todayKey } from "@/lib/helpers";
import { useMotionReduced } from "@/lib/hooks/useMotionReduced";
import { isScheduledForDate } from "@/lib/schedule";
import { getChainFrom, getStackRoot, isInStack } from "@/lib/stack";
import { completionRate } from "@/lib/store";
import type { Habit } from "@/lib/types";

import styles from "./page.module.css";

/**
 * TodayPage — the home dashboard. Shows three stat cards, an identity
 * vote banner, and the list of habits scheduled for today that are not
 * yet done. Habits belonging to a stack chain are rendered through
 * <StackCardGroup /> so the user sees the next undone link in the chain
 * with a wallet-style "+N more" peek.
 *
 * Heavy components (mood sheet, stack picker, etc.) live in their own
 * files. This page is purely composition + memoised derivations.
 */
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

  /**
   * Build today's render list. Each scheduled-undone habit is either:
   *   - The "visible top" of a stack chain — exactly one habit per chain
   *     (the first undone habit reachable from the root via all habits,
   *     not just undone habits). The card group then walks forward from
   *     this habit using the full habit list so it can show upcoming
   *     cards in the chain.
   *   - A solo habit, rendered as a single row.
   * Each chain renders at most once, even if multiple habits in the chain
   * are undone today.
   */
  const todayItems = ((): Array<
    { kind: "solo"; habit: Habit } | { kind: "stack"; rootId: string; visible: Habit }
  > => {
    const seenChains = new Set<string>();
    const items: Array<
      { kind: "solo"; habit: Habit } | { kind: "stack"; rootId: string; visible: Habit }
    > = [];
    for (const habit of scheduledUndone) {
      if (!isInStack(habit, habits)) {
        items.push({ kind: "solo", habit });
        continue;
      }
      const root = getStackRoot(habit, habits);
      if (seenChains.has(root.id)) continue;
      seenChains.add(root.id);
      const fullChain = getChainFrom(root, habits);
      const firstVisible =
        fullChain.find((h) => isScheduledForDate(today, h.schedule) && !h.history[today]) ??
        fullChain.find((h) => !h.history[today]) ??
        fullChain[0];
      if (firstVisible) {
        items.push({ kind: "stack", rootId: root.id, visible: firstVisible });
      }
    }
    return items;
  })();

  // Search filter — case-insensitive across name / identity / cue.
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return habits.filter(
      (habit) =>
        habit.name.toLowerCase().includes(q) ||
        habit.identity.toLowerCase().includes(q) ||
        habit.cue.toLowerCase().includes(q),
    );
  }, [habits, searchQuery]);

  // Completion stats — only count habits actually scheduled for today.
  const doneScheduledToday = scheduledToday.filter((habit) => habit.history[today]).length;
  const pct = scheduledToday.length ? Math.round((doneScheduledToday / scheduledToday.length) * 100) : 0;
  const hour = new Date().getHours();
  const greet =
    hour < 5 ? "Late night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Per-day completion for the sparkline (last 14 days).
  const last14 = useMemo(() => {
    const days: { key: string; done: number; total: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const key = dateAdd(today, -i);
      const scheduled = habits.filter((habit) => isScheduledForDate(key, habit.schedule));
      const done = scheduled.filter((habit) => habit.history[key]).length;
      days.push({ key, done, total: scheduled.length });
    }
    return days;
  }, [habits, today]);

  // Tally today's votes by identity for the banner — only habits that
  // were actually scheduled today contribute.
  const votes = useMemo(() => {
    const tally = new Map<string, number>();
    habits.forEach((habit) => {
      if (habit.history[today] && isScheduledForDate(today, habit.schedule)) {
        tally.set(habit.identity, (tally.get(habit.identity) ?? 0) + 1);
      }
    });
    return Array.from(tally.entries());
  }, [habits, today]);

  const topHabit = [...habits].sort((a, b) => streak(b) - streak(a))[0];

  /**
   * Render one habit row (used in both the search-results list and the
   * "Habits" today list). Extracted as a closure so we don't repeat the
   * full motion + grid markup twice.
   */
  const renderHabitRow = (
    habit: Habit,
    options: { showBadges: boolean; alwaysSetMoodOnCheck: boolean },
  ) => {
    const activeStreak = streak(habit);
    const rate = Math.round(completionRate(habit) * 100);
    const isDone = Boolean(habit.history[today]);
    const isScheduled = isScheduledForDate(today, habit.schedule);
    return (
      <motion.div
        className={`click-row habit-list-row ${styles.row}`}
        onClick={() => router.push(`/habits/${habit.id}`)}
        whileHover={reduced ? undefined : { y: -2, boxShadow: "var(--shadow-md)" }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="habit-list-field">
          <motion.button
            className={`check ${isDone ? "done" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              if (!isDone || options.alwaysSetMoodOnCheck) setMoodHabit(habit);
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
          <div className={styles.nameInner}>
            <div className="habit-name">{habit.name}</div>
            <div className={`mono muted ${styles.captionMono}`}>
              {habit.identity}
              {options.showBadges && !isScheduled && (
                <span className={styles.notTodayBadge}>· Not today</span>
              )}
              {options.showBadges && isDone && <span className={styles.doneBadge}>· Done</span>}
            </div>
          </div>
        </div>
        <div className="habit-list-field">
          <div className={`mono ${styles.streak} ${activeStreak > 0 ? styles.streakActive : ""}`}>
            {activeStreak}d
          </div>
        </div>
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
    );
  };

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
            {doneScheduledToday === scheduledToday.length && scheduledToday.length > 0 ? (
              <>
                A clean sweep. <em>Vote cast.</em>
              </>
            ) : doneScheduledToday === 0 ? (
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
        <div className={styles.headerCluster}>
          <div className={styles.searchWrap}>
            <IconSearch className={styles.searchIcon} />
            <input
              className={`input ${styles.searchInput}`}
              placeholder="Search habits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              // Width is dynamic; passed through as --search-w so the
              // .searchInput class stays static.
              style={{ ["--search-w" as string]: searchQuery ? "220px" : "160px" }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className={styles.searchClear}>
                <IconClose className={styles.searchClearIcon} />
              </button>
            )}
          </div>
          <motion.button
            className="btn btn-sm btn-primary"
            onClick={() => router.push("/habits/new")}
            whileHover={reduced ? undefined : { y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <IconPlus className={styles.iconSm} />
            New habit
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        className={styles.statsRow}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.div
          className={`card card-pad ${styles.completionCard}`}
          whileHover={reduced ? undefined : { y: -2, boxShadow: "var(--shadow-md)" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <CompletionRing pct={pct} />
          <div>
            <div className="eyebrow">Today</div>
            <div className={styles.bigNumber}>
              {doneScheduledToday}
              <span className={styles.bigDenom}>/{scheduledToday.length}</span>
            </div>
            <div className={`muted ${styles.captionMuted}`}>
              {doneScheduledToday === 0
                ? "Nothing checked yet"
                : doneScheduledToday === scheduledToday.length
                  ? "All done - well done."
                  : `${scheduledToday.length - doneScheduledToday} habits remaining`}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card card-pad"
          whileHover={reduced ? undefined : { y: -2, boxShadow: "var(--shadow-md)" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="eyebrow">Longest active streak</div>
          <div className={styles.numberWithUnit}>
            <div className={styles.bigNumber}>{Math.max(0, ...habits.map(streak))}</div>
            <div className={`muted mono ${styles.unitLabel}`}>days</div>
          </div>
          <div className={`muted ${styles.captionMuted}`}>
            {topHabit ? `${topHabit.name} - keep it warm.` : "-"}
          </div>
        </motion.div>

        <motion.div
          className="card card-pad"
          whileHover={reduced ? undefined : { y: -2, boxShadow: "var(--shadow-md)" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="eyebrow">Last 14 days</div>
          <div className={styles.sparkRow}>
            {last14.map((day, index) => {
              const height = day.total ? (day.done / day.total) * 100 : 0;
              const isToday = index === last14.length - 1;
              const barBg = isToday
                ? "var(--accent)"
                : height > 50
                  ? "var(--ink-2)"
                  : "var(--rule-strong)";
              return (
                <div key={day.key} className={styles.sparkCol}>
                  <motion.div
                    className={styles.sparkBar}
                    // Bar height + colour are data-driven. Pass both via
                    // inline CSS variables so the class stays generic.
                    style={
                      {
                        "--bar-h": `${Math.max(4, height)}%`,
                        "--bar-bg": barBg,
                      } as React.CSSProperties
                    }
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 + index * 0.03, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
              );
            })}
          </div>
          <div className={`muted mono ${styles.sparkAxis}`}>
            <span>2 WEEKS AGO</span>
            <span>TODAY</span>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className={`card card-pad ${styles.identityBanner}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className={styles.identityRow}>
          <div>
            <div className="eyebrow">Today, you&apos;re voting for</div>
            <div className={styles.identityStatement}>{store.identity.statement}</div>
          </div>
          <div>
            <div className={`eyebrow ${styles.identityListLabel}`}>Today&apos;s votes by identity</div>
            {votes.length === 0 ? (
              <div className={`muted ${styles.identityEmpty}`}>
                No votes cast yet - check off a habit below.
              </div>
            ) : (
              <StaggerContainer className={styles.identityList} staggerDelay={0.04}>
                {votes.map(([identity, count]) => (
                  <StaggerItem key={identity}>
                    <div className={styles.identityListRow}>
                      <span className={styles.identityListLabelText}>
                        I am <span className={styles.identityAccent}>{identity}</span>
                      </span>
                      <span className={`mono ${styles.identityListCount}`}>+{count}</span>
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
          className={styles.section}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className={styles.sectionHeader}>
            <h2 className="h3">Search results</h2>
            <span className={`muted mono ${styles.sectionCounter}`}>{searchResults.length} found</span>
          </div>
          <div className="habit-list">
            <StaggerContainer staggerDelay={0.04}>
              {searchResults.map((habit) => (
                <StaggerItem key={habit.id}>
                  {renderHabitRow(habit, { showBadges: true, alwaysSetMoodOnCheck: false })}
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </motion.section>
      )}

      {searchQuery && searchResults.length === 0 && (
        <motion.div
          className={`card card-pad ${styles.emptyCard}`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="eyebrow">No results</div>
          <h2 className={`h2 ${styles.emptyTitle}`}>
            No habits match &quot;{searchQuery}&quot;.
          </h2>
        </motion.div>
      )}

      {!searchQuery && scheduledUndone.length > 0 && (
        <motion.section
          className={styles.section}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className={styles.sectionHeader}>
            <h2 className="h3">Habits</h2>
            <span className={`muted mono ${styles.sectionCounter}`}>
              {scheduledUndone.length} remaining
            </span>
          </div>
          <div className="habit-list">
            <StaggerContainer staggerDelay={0.04}>
              {todayItems.map((item) => {
                if (item.kind === "stack") {
                  return (
                    <StaggerItem key={`stack-${item.rootId}`}>
                      <StackCardGroup
                        habit={item.visible}
                        habits={habits}
                        today={today}
                        onCheck={(h) => {
                          setMoodHabit(h);
                          toggleHabit(h.id);
                        }}
                        onNavigate={(id) => router.push(`/habits/${id}`)}
                        streak={streak}
                      />
                    </StaggerItem>
                  );
                }
                return (
                  <StaggerItem key={item.habit.id}>
                    {renderHabitRow(item.habit, { showBadges: false, alwaysSetMoodOnCheck: true })}
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </motion.section>
      )}

      {!searchQuery && habits.length > 0 && scheduledUndone.length === 0 && (
        <motion.div
          className={`card card-pad ${styles.emptyCard}`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="eyebrow">
            {scheduledToday.length === 0 ? "Nothing scheduled" : "All caught up"}
          </div>
          <h2 className={`h2 ${styles.emptyTitle}`}>
            {scheduledToday.length === 0
              ? "No habits scheduled for today."
              : "Every scheduled habit is complete."}
          </h2>
          <p className={`muted ${styles.emptyBodyTight}`}>
            {scheduledToday.length === 0
              ? "Enjoy your free time or browse your habit library."
              : "Great work casting your identity votes today."}
          </p>
        </motion.div>
      )}

      {habits.length === 0 && (
        <motion.div
          className={`card card-pad ${styles.emptyCard}`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="eyebrow">No habits yet</div>
          <h2 className={`h2 ${styles.emptyTitle}`}>Design your first daily vote.</h2>
          <p className={`muted ${styles.emptyBodyCta}`}>
            Start with one small behavior tied to a clear identity.
          </p>
          <motion.button
            className="btn btn-primary"
            onClick={() => router.push("/habits/new")}
            whileHover={reduced ? undefined : { y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <IconPlus className={styles.iconSm} />
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
