"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerContainer";
import { FormationQuestionnaire } from "@/components/FormationQuestionnaire";
import { useStoreContext } from "@/components/StoreProvider";
import { todayKey } from "@/lib/helpers";
import { clientLogger } from "@/lib/logger-client";
import type { FormationVerdict, Habit } from "@/lib/types";

import styles from "./page.module.css";

/** A habit qualifies for formation review after 66 consecutive days
 *  (the round number popularised by James Clear). */
const FORMATION_DAYS = 66;

/** Days elapsed between a habit's createdAt date and today. */
function daysSince(dateKey: string) {
  const start = new Date(`${dateKey}T00:00:00`);
  const end = new Date(`${todayKey()}T00:00:00`);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}

/**
 * Hall of Fame — surfaces habits that have crossed (or are crossing) the
 * 66-day formation threshold. Three sections:
 *   1. Ready for review — habits ≥ 66 days old, awaiting a verdict.
 *   2. Inducted — habits whose verdict is "formed".
 *   3. In progress — habits < 66 days, with a progress bar to the goal.
 */
export default function HallOfFamePage() {
  const {
    habits,
    streak,
    longestStreak,
    completionRate,
    formationVerdicts: verdicts,
    saveFormationVerdict,
  } = useStoreContext();
  const [reviewing, setReviewing] = useState<Habit | null>(null);
  const today = todayKey();
  const reviewedIds = new Set(verdicts.map((verdict) => verdict.habitId));

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "hall-of-fame" });
  }, []);

  const ready = habits.filter(
    (habit) => daysSince(habit.createdAt) >= FORMATION_DAYS && !reviewedIds.has(habit.id),
  );
  const inProgress = habits.filter(
    (habit) => daysSince(habit.createdAt) < FORMATION_DAYS && !reviewedIds.has(habit.id),
  );

  // Inducted = verdicts marked as "formed" joined back to their habits.
  // Memoised so we don't re-walk verdicts on every render.
  const inducted = useMemo(
    () =>
      verdicts
        .filter((verdict) => verdict.formed)
        .map((verdict) => ({
          verdict,
          habit: habits.find((habit) => habit.id === verdict.habitId),
        }))
        .filter((item) => item.habit),
    [habits, verdicts],
  );

  const saveVerdict = (verdict: FormationVerdict) => {
    clientLogger.info("Formation verdict submitted", {
      page: "hall-of-fame",
      habitId: verdict.habitId,
      formed: verdict.formed,
      score: verdict.score,
    });
    saveFormationVerdict(verdict);
    setReviewing(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="page-header">
        <div>
          <div className="eyebrow">Become</div>
          <h1 className="h1">Hall of <em>Fame</em></h1>
        </div>
      </div>

      <section className={`card card-pad ${styles.readySection}`}>
        <div className="eyebrow">Ready for review</div>
        <div className={styles.readyList}>
          {ready.length ? (
            <StaggerContainer staggerDelay={0.05}>
              {ready.map((habit) => (
                <StaggerItem key={habit.id}>
                  <motion.div
                    className={styles.readyRow}
                    whileHover={{ x: 2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <div>
                      <div className="habit-name">{habit.name}</div>
                      <div className={`muted mono ${styles.captionMono}`}>
                        {daysSince(habit.createdAt)} days old · {habit.identity}
                      </div>
                    </div>
                    <motion.button
                      className="btn btn-primary"
                      onClick={() => {
                        clientLogger.info("Formation review opened", {
                          page: "hall-of-fame",
                          habitId: habit.id,
                        });
                        setReviewing(habit);
                      }}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Review
                    </motion.button>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <div className="muted">No habits have reached 66 days yet.</div>
          )}
        </div>
      </section>

      <div className={styles.twoCol}>
        <section className="card card-pad">
          <div className="eyebrow">Inducted</div>
          <div className={styles.inductedGrid}>
            {inducted.length ? (
              inducted.map(
                ({ verdict, habit }) =>
                  habit && (
                    <div
                      key={verdict.habitId}
                      className={`card card-pad ${styles.inductedCard}`}
                    >
                      <div className="habit-name">{habit.name}</div>
                      <div className={`muted mono ${styles.captionMonoFirst}`}>
                        SCORE {verdict.score} · BEST {longestStreak(habit)}D
                      </div>
                      <div className={`muted mono ${styles.captionMonoSecond}`}>
                        {Math.round(completionRate(habit) * 100)}% adherence
                      </div>
                    </div>
                  ),
              )
            ) : (
              <div className="muted">No inducted habits yet.</div>
            )}
          </div>
        </section>

        <section className="card card-pad">
          <div className="eyebrow">In progress</div>
          <div className={styles.inProgressList}>
            {inProgress.map((habit) => {
              const age = daysSince(habit.createdAt);
              const pct = Math.round((age / FORMATION_DAYS) * 100);
              const activeStreak = streak(habit);
              const adherence = Math.round(completionRate(habit, 30) * 100);
              const doneToday = Boolean(habit.history[today]);
              return (
                <div key={habit.id}>
                  <div className={styles.progressHeader}>
                    <div className="habit-name">{habit.name}</div>
                    <div className={`mono muted ${styles.captionMono}`}>
                      {age}/{FORMATION_DAYS}
                    </div>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      // Animated width passed in as a CSS variable so the
                      // .progressFill class doesn't need to know the value.
                      style={{ ["--pct" as string]: `${pct}%` }}
                    />
                  </div>
                  <div className={styles.chipCluster}>
                    <span className={`chip ${doneToday ? "done" : ""}`}>
                      {doneToday ? "Done today" : "Open today"}
                    </span>
                    <span className="chip">{activeStreak}d active</span>
                    <span className="chip">{adherence}% 30-day</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {reviewing && (
        <FormationQuestionnaire
          habit={reviewing}
          onClose={() => setReviewing(null)}
          onSubmit={saveVerdict}
        />
      )}
    </motion.div>
  );
}
