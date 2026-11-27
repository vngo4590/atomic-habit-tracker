"use client";

import { CalendarCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { dateAdd, fmt, todayKey } from "@/lib/helpers";
import { clientLogger } from "@/lib/logger-client";
import type { WeeklyReview, WeeklyReviewAnswers } from "@/lib/types";

import { PastReviews } from "./PastReviews";
import { EMPTY_REVIEW, REVIEW_STEPS, hasReviewText, toReviewAnswers } from "./review-steps";
import { ReviewSummary } from "./ReviewSummary";
import { ReviewWizard } from "./ReviewWizard";
import { WeekSnapshot } from "./WeekSnapshot";
import styles from "./WeeklyReviewView.module.css";

/**
 * WeeklyReviewView — the /review page. Last-7-day context first, then this
 * week's review (an inviting empty state, the guided wizard, or the saved
 * answers), then earlier weeks collapsed underneath.
 */
export function WeeklyReviewView() {
  const { habits, completionRate, showToast, weeklyReview, weeklyReviews, setWeeklyReview } = useStoreContext();
  const today = todayKey();
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => dateAdd(today, index - 6)), [today]);
  const weekStartKey = days[0];
  const currentReview: WeeklyReviewAnswers = weeklyReviews.find((review) => review.weekStartKey === weekStartKey) ?? {
    ...weeklyReview,
  };
  const currentHasReview = hasReviewText(currentReview);
  const pastReviews = weeklyReviews.filter((review) => review.weekStartKey !== weekStartKey);
  const [editing, setEditing] = useState<{ weekStartKey: string; answers: WeeklyReviewAnswers } | null>(null);

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "review" });
  }, []);

  const startEditing = (review: WeeklyReview | null) => {
    setEditing({
      weekStartKey: review?.weekStartKey ?? weekStartKey,
      answers: review ? toReviewAnswers(review) : currentHasReview ? toReviewAnswers(currentReview) : EMPTY_REVIEW,
    });
  };

  const save = (answers: WeeklyReviewAnswers) => {
    const target = editing?.weekStartKey ?? weekStartKey;
    clientLogger.info("Weekly review submission attempted", {
      page: "review",
      weekStartKey: target,
      answeredCount: REVIEW_STEPS.filter((step) => Boolean(answers[step.field].trim())).length,
    });
    setWeeklyReview(target, toReviewAnswers(answers));
    setEditing(null);
    showToast("Weekly review saved", "Reflection captured to your account");
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Weekly review" subtitle="Look back at the last seven days, then choose one small adjustment." />

      <WeekSnapshot days={days} habits={habits} completionRate={completionRate} />

      {editing ? (
        <ReviewWizard
          title={editing.weekStartKey === weekStartKey ? "This week's review" : `Week of ${fmt.short(editing.weekStartKey)}`}
          initial={editing.answers}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      ) : currentHasReview ? (
        <ReviewSummary review={currentReview} onEdit={() => startEditing(null)} />
      ) : (
        <Card>
          <EmptyState
            icon={<CalendarCheck strokeWidth={1.75} />}
            title="Reflect on this week"
            action={<Button onClick={() => startEditing(null)}>Write this week&apos;s review</Button>}
          >
            Three short questions: what worked, the smallest fix, and who you&apos;re becoming. It takes about five
            minutes.
          </EmptyState>
        </Card>
      )}

      <PastReviews reviews={pastReviews} onEdit={(review) => startEditing(review)} />
    </div>
  );
}
