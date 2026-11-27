"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { PageHeader } from "@/components/ui";
import { todayKey } from "@/lib/helpers";
import { clientLogger } from "@/lib/logger-client";
import type { FormationVerdict, Habit } from "@/lib/types";

import { groupForFormation } from "./formation";
import { FormationProgress } from "./FormationProgress";
import styles from "./HallOfFame.module.css";
import { InductedList } from "./InductedList";
import { ReadyForReview } from "./ReadyForReview";

// The five-question induction modal is only needed after "Review" is
// clicked, so it is split out of the page's first-load bundle.
const FormationQuestionnaire = dynamic(
  () => import("@/components/FormationQuestionnaire").then((mod) => mod.FormationQuestionnaire),
  { ssr: false },
);

/**
 * HallOfFameView — the /hall-of-fame page: habits ready for their 66-day
 * review, habits already inducted, and progress for the rest.
 */
export function HallOfFameView() {
  const { habits, streak, longestStreak, completionRate, formationVerdicts, saveFormationVerdict } =
    useStoreContext();
  const [reviewing, setReviewing] = useState<Habit | null>(null);
  const today = todayKey();

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "hall-of-fame" });
  }, []);

  const groups = useMemo(() => groupForFormation(habits, formationVerdicts, today), [formationVerdicts, habits, today]);

  const openReview = (habit: Habit) => {
    clientLogger.info("Formation review opened", { page: "hall-of-fame", habitId: habit.id });
    setReviewing(habit);
  };

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
    <div className={styles.page}>
      <PageHeader
        title="Hall of Fame"
        subtitle="Habits that have become part of who you are."
      />

      <ReadyForReview habits={groups.ready} today={today} onReview={openReview} />

      <div className={styles.split}>
        <InductedList items={groups.inducted} longestStreak={longestStreak} completionRate={completionRate} />
        {habits.length ? (
          <FormationProgress
            habits={groups.inProgress}
            today={today}
            streak={streak}
            completionRate={completionRate}
            onReview={openReview}
          />
        ) : null}
      </div>

      {reviewing ? (
        <FormationQuestionnaire habit={reviewing} onClose={() => setReviewing(null)} onSubmit={saveVerdict} />
      ) : null}
    </div>
  );
}
