"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { MarkdownText } from "@/components/MarkdownText";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerContainer";
import { useStoreContext } from "@/components/StoreProvider";
import { dateAdd, fmt, todayKey } from "@/lib/helpers";
import type { WeeklyReview, WeeklyReviewAnswers } from "@/lib/types";

import styles from "./page.module.css";

const QUESTIONS = [
  "What went well? Why?",
  "What didn't? What's the smallest fix?",
  "Who did I vote to become this week?",
];

const EMPTY_REVIEW: WeeklyReviewAnswers = {
  wentWell: "",
  smallestFix: "",
  identityVote: "",
};

const REVIEW_BUBBLES = [
  { label: "What went well?", tone: "warm" },
  { label: "Why did it work?", tone: "green" },
  { label: "Smallest fix?", tone: "blue" },
  { label: "Who did I vote to become?", tone: "ink" },
] as const;

/** True iff any of the three answer fields has user text. */
function hasReviewText(review: WeeklyReviewAnswers) {
  return [review.wentWell, review.smallestFix, review.identityVote].some((value) => value.trim());
}

function toReviewAnswers(review: WeeklyReviewAnswers): WeeklyReviewAnswers {
  return {
    wentWell: review.wentWell,
    smallestFix: review.smallestFix,
    identityVote: review.identityVote,
  };
}

function reviewSummary(review: WeeklyReviewAnswers) {
  return review.wentWell || review.smallestFix || review.identityVote || "No notes saved yet.";
}

/** Intro panel shown when no review exists for the current week. */
function ReviewIntro({ onStart }: { onStart: () => void }) {
  return (
    <section className="principle-intro">
      <div className="principle-copy">
        <div className="eyebrow">Reflection</div>
        <h2 className="h3">Turn the week into a clearer next move</h2>
        <p>Use the review to notice what worked, choose the smallest fix, and name the identity your actions voted for.</p>
        <button className="btn btn-primary btn-sm" onClick={onStart}>Write this week&apos;s review</button>
      </div>
      <div className="principle-bubbles" aria-hidden="true">
        {REVIEW_BUBBLES.map((bubble, index) => (
          <span
            key={bubble.label}
            className={`principle-bubble ${bubble.tone}`}
            style={{ "--bubble-index": index } as CSSProperties}
          >
            {bubble.label}
          </span>
        ))}
      </div>
    </section>
  );
}

/** Read-only view of an existing review with an "Edit" button. */
function ReviewDisplay({
  review,
  title,
  onEdit,
}: {
  review: WeeklyReviewAnswers;
  title: string;
  onEdit: () => void;
}) {
  return (
    <section className="card card-pad">
      <div className={styles.displayHeader}>
        <div>
          <div className="eyebrow">Reflection</div>
          <h2 className={`h3 ${styles.titleSpacer}`}>{title}</h2>
        </div>
        <button className="btn btn-sm btn-primary" onClick={onEdit}>Edit review</button>
      </div>
      <div className={styles.answers}>
        {QUESTIONS.map((question, index) => {
          const field = ["wentWell", "smallestFix", "identityVote"][index] as keyof WeeklyReviewAnswers;
          const text = review[field];
          return (
            <div key={question}>
              <div className="field-label">{question}</div>
              {text ? (
                /* Render saved answers as markdown so users can format reviews
                   the same way they format journal entries. */
                <MarkdownText className={styles.answer}>{text}</MarkdownText>
              ) : (
                <p className={`${styles.answer} ${styles.answerEmpty}`}>Not answered yet.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * ReviewPage — weekly retrospective. Shows the last 7 days as a bar
 * chart, wins (>=85%) and slips (<50%) lists, an editable answers form
 * for this week's review, and an archive of past reviews with
 * pagination.
 */
export default function ReviewPage() {
  const { habits, completionRate, showToast, weeklyReview, weeklyReviews, setWeeklyReview } = useStoreContext();
  const today = todayKey();
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => dateAdd(today, index - 6)), [today]);
  const weekStartKey = days[0];
  const questionFields = ["wentWell", "smallestFix", "identityVote"] as const;
  const currentReview = weeklyReviews.find((review) => review.weekStartKey === weekStartKey) ?? {
    weekStartKey,
    ...weeklyReview,
    updatedAt: "",
  };
  const currentHasReview = hasReviewText(currentReview);
  const [editingWeekStartKey, setEditingWeekStartKey] = useState<string | null>(null);
  const [answers, setAnswers] = useState<WeeklyReviewAnswers>(
    currentHasReview ? toReviewAnswers(currentReview) : EMPTY_REVIEW,
  );
  const [showArchive, setShowArchive] = useState(false);
  const [archivePage, setArchivePage] = useState(0);
  const pastReviews = weeklyReviews.filter((review) => review.weekStartKey !== weekStartKey);
  const visiblePastReviews = showArchive
    ? pastReviews.slice(archivePage * 5, archivePage * 5 + 5)
    : pastReviews.slice(0, 5);
  const totalArchivePages = Math.max(1, Math.ceil(pastReviews.length / 5));

  const totals = useMemo(() => {
    const possible = days.length * habits.length;
    const done = days.reduce(
      (sum, day) => sum + habits.filter((habit) => habit.history[day]).length,
      0,
    );
    return { done, possible, pct: possible ? Math.round((done / possible) * 100) : 0 };
  }, [days, habits]);

  const wins = habits.filter((habit) => completionRate(habit, 7) >= 0.85);
  const slips = habits.filter((habit) => completionRate(habit, 7) < 0.5);
  const startEditing = (review: WeeklyReview | null = null) => {
    setEditingWeekStartKey(review?.weekStartKey ?? weekStartKey);
    setAnswers(toReviewAnswers(review ?? currentReview));
  };
  const saveReview = () => {
    const targetWeekStartKey = editingWeekStartKey || weekStartKey;
    setWeeklyReview(targetWeekStartKey, toReviewAnswers(answers));
    setEditingWeekStartKey(null);
    showToast("Weekly review saved", "Reflection captured to your account");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="page-header">
        <div>
          <div className="eyebrow">Reflect</div>
          <h1 className="h1">Weekly <em>review</em></h1>
        </div>
      </div>

      <section className={`card card-pad ${styles.weekSection}`}>
        <div className={styles.weekHeader}>
          <h2 className="h3">Last 7 days</h2>
          <div className={`mono muted ${styles.weekTotals}`}>
            {totals.done} / {totals.possible} check-ins · {totals.pct}%
          </div>
        </div>
        {/* Horizontally scrollable on mobile, 7-column grid on desktop */}
        <div className="review-week-grid">
          {days.map((day) => {
            const count = habits.filter((habit) => habit.history[day]).length;
            const pct = habits.length ? Math.round((count / habits.length) * 100) : 0;
            return (
              <motion.div
                key={day}
                className="review-day-card"
                whileHover={{ y: -2, borderColor: "var(--rule-strong)" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div>
                  <div className={`mono muted ${styles.dayLabel}`}>{fmt.weekday(day)}</div>
                  <div className={styles.dayNumber}>{day.slice(-2)}</div>
                </div>
                <div>
                  <div className="review-day-bar-container">
                    <motion.div
                      className={styles.dayBarFill}
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(4, pct)}%` }}
                      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>
                  <div className={`mono muted ${styles.dayPercent}`}>{pct}%</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Wins and slips — stacks vertically on mobile */}
      <div className="review-insights-grid">
        <section className="card card-pad">
          <div className="eyebrow">Wins</div>
          <StaggerContainer className={styles.insightList} staggerDelay={0.05}>
            {wins.length ? (
              wins.map((habit) => (
                <StaggerItem key={habit.id}>
                  <motion.div whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                    <div className="habit-name">{habit.name}</div>
                    <div className={`muted mono ${styles.insightCaption}`}>
                      {Math.round(completionRate(habit, 7) * 100)}% this week
                    </div>
                  </motion.div>
                </StaggerItem>
              ))
            ) : (
              <div className="muted">No habit was 85%+ this week</div>
            )}
          </StaggerContainer>
        </section>
        <section className="card card-pad">
          <div className="eyebrow">Slips</div>
          <StaggerContainer className={styles.insightList} staggerDelay={0.05}>
            {slips.length ? (
              slips.map((habit) => (
                <StaggerItem key={habit.id}>
                  <motion.div whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                    <div className="habit-name">{habit.name}</div>
                    <div className={`muted mono ${styles.insightCaption}`}>
                      {Math.round(completionRate(habit, 7) * 100)}% this week
                    </div>
                  </motion.div>
                </StaggerItem>
              ))
            ) : (
              <div className="muted">No habit fell below 50% this week</div>
            )}
          </StaggerContainer>
        </section>
      </div>

      {editingWeekStartKey !== null ? (
        <section className="card card-pad">
          <div className="eyebrow">Reflection</div>
          <h2 className={`h3 ${styles.titleSpacer}`}>
            {editingWeekStartKey === weekStartKey
              ? "This week's review"
              : `Week of ${fmt.short(editingWeekStartKey)}`}
          </h2>
          <div className={styles.editorList}>
            {QUESTIONS.map((question, index) => {
              const field = questionFields[index];
              return (
                <label key={question}>
                  <span className="field-label">{question}</span>
                  <textarea
                    className="input"
                    rows={4}
                    value={answers[field]}
                    onChange={(event) =>
                      setAnswers((current) => ({ ...current, [field]: event.target.value }))
                    }
                  />
                </label>
              );
            })}
          </div>
          <div className={styles.editorActions}>
            <motion.button
              className="btn"
              onClick={() => setEditingWeekStartKey(null)}
              whileTap={{ scale: 0.97 }}
            >
              Cancel
            </motion.button>
            <motion.button
              className="btn btn-primary"
              onClick={saveReview}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              Save review
            </motion.button>
          </div>
        </section>
      ) : currentHasReview ? (
        <ReviewDisplay
          review={currentReview}
          title="This week's review"
          onEdit={() => startEditing(currentReview)}
        />
      ) : (
        <ReviewIntro onStart={() => startEditing(null)} />
      )}

      <section className={`card card-pad ${styles.archiveSection}`}>
        <div className={styles.archiveHeader}>
          <div>
            <div className="eyebrow">Past reviews</div>
            <h2 className={`h3 ${styles.titleSpacer}`}>
              {showArchive ? "Review archive" : "Top 5 summaries"}
            </h2>
          </div>
          {pastReviews.length > 5 && (
            <button
              className="btn btn-sm"
              onClick={() => {
                setShowArchive((current) => !current);
                setArchivePage(0);
              }}
            >
              {showArchive ? "Show summary" : "Read more"}
            </button>
          )}
        </div>
        <div className={styles.archiveList}>
          {visiblePastReviews.length ? (
            visiblePastReviews.map((review) => {
              const summaryText = reviewSummary(review);
              const truncated = summaryText.slice(0, 120) + (summaryText.length > 120 ? "..." : "");
              const hasNotes = hasReviewText(review);
              return (
                <div key={review.weekStartKey} className="review-past-row">
                  <div className={`mono muted ${styles.insightCaption}`}>
                    {fmt.short(review.weekStartKey)}
                  </div>
                  <div>
                    {/* Summary preview. Render as markdown so formatting (bold,
                        lists, links) appears the same as in the full display.
                        Fall back to plain text for the "No notes saved yet."
                        placeholder so it stays styled as muted italic copy. */}
                    {hasNotes ? (
                      <MarkdownText className={styles.summary}>{truncated}</MarkdownText>
                    ) : (
                      <div className={styles.summary}>{truncated}</div>
                    )}
                    {showArchive && (
                      <div className={`muted ${styles.summaryDetail}`}>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Fix:</span>
                          {review.smallestFix ? (
                            <MarkdownText className={styles.detailValue}>{review.smallestFix}</MarkdownText>
                          ) : (
                            <span>Not answered</span>
                          )}
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Vote:</span>
                          {review.identityVote ? (
                            <MarkdownText className={styles.detailValue}>{review.identityVote}</MarkdownText>
                          ) : (
                            <span>Not answered</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <button className="btn btn-sm" onClick={() => startEditing(review)}>
                    Edit
                  </button>
                </div>
              );
            })
          ) : (
            <p className={styles.archiveEmpty}>No past reviews yet.</p>
          )}
        </div>
        {showArchive && pastReviews.length > 5 && (
          <div className={styles.archivePagination}>
            <button
              className="btn btn-sm"
              disabled={archivePage === 0}
              onClick={() => setArchivePage((page) => Math.max(0, page - 1))}
            >
              Previous
            </button>
            <span className={`mono muted ${styles.pageLabel}`}>
              Page {archivePage + 1} / {totalArchivePages}
            </span>
            <button
              className="btn btn-sm"
              disabled={archivePage >= totalArchivePages - 1}
              onClick={() => setArchivePage((page) => Math.min(totalArchivePages - 1, page + 1))}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </motion.div>
  );
}
