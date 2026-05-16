"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerContainer";
import { useStoreContext } from "@/components/StoreProvider";
import { dateAdd, fmt, todayKey } from "@/lib/helpers";
import type { WeeklyReview, WeeklyReviewAnswers } from "@/lib/types";

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
          <span key={bubble.label} className={`principle-bubble ${bubble.tone}`} style={{ "--bubble-index": index } as CSSProperties}>
            {bubble.label}
          </span>
        ))}
      </div>
    </section>
  );
}

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, marginBottom: 14 }}>
        <div>
          <div className="eyebrow">Reflection</div>
          <h2 className="h3" style={{ marginTop: 6 }}>{title}</h2>
        </div>
        <button className="btn btn-sm btn-primary" onClick={onEdit}>Edit review</button>
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        {QUESTIONS.map((question, index) => {
          const field = ["wentWell", "smallestFix", "identityVote"][index] as keyof WeeklyReviewAnswers;
          return (
            <div key={question}>
              <div className="field-label">{question}</div>
              <p style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", color: review[field] ? "var(--ink)" : "var(--ink-3)", lineHeight: 1.45 }}>
                {review[field] || "Not answered yet."}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function ReviewPage() {
  const { habits, completionRate, showToast, weeklyReview, weeklyReviews, setWeeklyReview } = useStoreContext();
  const today = todayKey();
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => dateAdd(today, index - 6)), [today]);
  const weekStartKey = days[0];
  const questionFields = ["wentWell", "smallestFix", "identityVote"] as const;
  const currentReview = weeklyReviews.find((review) => review.weekStartKey === weekStartKey) ?? { weekStartKey, ...weeklyReview, updatedAt: "" };
  const currentHasReview = hasReviewText(currentReview);
  const [editingWeekStartKey, setEditingWeekStartKey] = useState<string | null>(null);
  const [answers, setAnswers] = useState<WeeklyReviewAnswers>(currentHasReview ? toReviewAnswers(currentReview) : EMPTY_REVIEW);
  const [showArchive, setShowArchive] = useState(false);
  const [archivePage, setArchivePage] = useState(0);
  const pastReviews = weeklyReviews.filter((review) => review.weekStartKey !== weekStartKey);
  const visiblePastReviews = showArchive ? pastReviews.slice(archivePage * 5, archivePage * 5 + 5) : pastReviews.slice(0, 5);
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
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}>
      <div className="page-header">
        <div>
          <div className="eyebrow">Reflect</div>
          <h1 className="h1">Weekly <em>review</em></h1>
        </div>
      </div>

      <section className="card card-pad" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
          <h2 className="h3">Last 7 days</h2>
          <div className="mono muted" style={{ fontSize: 12 }}>
            {totals.done} / {totals.possible} check-ins · {totals.pct}%
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
          {days.map((day) => {
            const count = habits.filter((habit) => habit.history[day]).length;
            const pct = habits.length ? Math.round((count / habits.length) * 100) : 0;
            return (
              <motion.div key={day} style={{ minHeight: 132, background: "var(--bg-sunk)", border: "1px solid var(--rule)", borderRadius: 8, padding: 12, display: "grid", alignContent: "space-between" }} whileHover={{ y: -2, borderColor: "var(--rule-strong)" }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <div>
                  <div className="mono muted" style={{ fontSize: 10 }}>{fmt.weekday(day)}</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 24 }}>{day.slice(-2)}</div>
                </div>
                <div>
                  <div style={{ height: 72, display: "flex", alignItems: "end" }}>
                    <motion.div
                      style={{ width: "100%", background: "var(--accent)", borderRadius: 4 }}
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(4, pct)}%` }}
                      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>
                  <div className="mono muted" style={{ fontSize: 10, marginTop: 6 }}>{pct}%</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <section className="card card-pad">
          <div className="eyebrow">Wins</div>
          <StaggerContainer style={{ display: "grid", gap: 12, marginTop: 14 }} staggerDelay={0.05}>
            {wins.length ? wins.map((habit) => (
              <StaggerItem key={habit.id}>
                <motion.div whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <div className="habit-name">{habit.name}</div>
                <div className="muted mono" style={{ fontSize: 11 }}>{Math.round(completionRate(habit, 7) * 100)}% this week</div>
              </motion.div>
              </StaggerItem>
            )) : <div className="muted">No habit was 85%+ this week</div>}
          </StaggerContainer>
        </section>
        <section className="card card-pad">
          <div className="eyebrow">Slips</div>
          <StaggerContainer style={{ display: "grid", gap: 12, marginTop: 14 }} staggerDelay={0.05}>
            {slips.length ? slips.map((habit) => (
              <StaggerItem key={habit.id}>
                <motion.div whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <div className="habit-name">{habit.name}</div>
                <div className="muted mono" style={{ fontSize: 11 }}>{Math.round(completionRate(habit, 7) * 100)}% this week</div>
              </motion.div>
              </StaggerItem>
            )) : <div className="muted">No habit fell below 50% this week</div>}
          </StaggerContainer>
        </section>
      </div>

      {editingWeekStartKey !== null ? (
        <section className="card card-pad">
          <div className="eyebrow">Reflection</div>
          <h2 className="h3" style={{ marginTop: 6 }}>{editingWeekStartKey === weekStartKey ? "This week's review" : `Week of ${fmt.short(editingWeekStartKey)}`}</h2>
          <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
            {QUESTIONS.map((question, index) => {
              const field = questionFields[index];
              return (
                <label key={question}>
                  <span className="field-label">{question}</span>
                  <textarea className="input" rows={4} value={answers[field]} onChange={(event) => setAnswers((current) => ({ ...current, [field]: event.target.value }))} />
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
            <motion.button className="btn" onClick={() => setEditingWeekStartKey(null)} whileTap={{ scale: 0.97 }}>Cancel</motion.button>
            <motion.button className="btn btn-primary" onClick={saveReview} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>Save review</motion.button>
          </div>
        </section>
      ) : currentHasReview ? (
        <ReviewDisplay review={currentReview} title="This week's review" onEdit={() => startEditing(currentReview)} />
      ) : (
        <ReviewIntro onStart={() => startEditing(null)} />
      )}

      <section className="card card-pad" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, marginBottom: 14 }}>
          <div>
            <div className="eyebrow">Past reviews</div>
            <h2 className="h3" style={{ marginTop: 6 }}>{showArchive ? "Review archive" : "Top 5 summaries"}</h2>
          </div>
          {pastReviews.length > 5 && (
            <button className="btn btn-sm" onClick={() => { setShowArchive((current) => !current); setArchivePage(0); }}>
              {showArchive ? "Show summary" : "Read more"}
            </button>
          )}
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {visiblePastReviews.length ? visiblePastReviews.map((review) => (
            <div key={review.weekStartKey} style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", gap: 14, alignItems: "center", padding: "12px 0", borderTop: "1px solid var(--rule)" }}>
              <div className="mono muted" style={{ fontSize: 11 }}>{fmt.short(review.weekStartKey)}</div>
              <div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontStyle: "italic", color: "var(--ink)" }}>{reviewSummary(review).slice(0, 120)}{reviewSummary(review).length > 120 ? "..." : ""}</div>
                {showArchive && (
                  <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                    Fix: {review.smallestFix || "Not answered"} · Vote: {review.identityVote || "Not answered"}
                  </div>
                )}
              </div>
              <button className="btn btn-sm" onClick={() => startEditing(review)}>Edit</button>
            </div>
          )) : (
            <p style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 16, fontStyle: "italic", color: "var(--ink-3)" }}>No past reviews yet.</p>
          )}
        </div>
        {showArchive && pastReviews.length > 5 && (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 14 }}>
            <button className="btn btn-sm" disabled={archivePage === 0} onClick={() => setArchivePage((page) => Math.max(0, page - 1))}>Previous</button>
            <span className="mono muted" style={{ fontSize: 11 }}>Page {archivePage + 1} / {totalArchivePages}</span>
            <button className="btn btn-sm" disabled={archivePage >= totalArchivePages - 1} onClick={() => setArchivePage((page) => Math.min(totalArchivePages - 1, page + 1))}>Next</button>
          </div>
        )}
      </section>
    </motion.div>
  );
}
