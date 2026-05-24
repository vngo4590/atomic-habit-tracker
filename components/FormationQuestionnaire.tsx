"use client";

import { useMemo, useState } from "react";

import type { FormationVerdict, Habit } from "@/lib/types";

import styles from "./FormationQuestionnaire.module.css";

/** The five formation questions. Order matters — used as index keys in the
    ratings record so the user's score per question is stable. */
const QUESTIONS = [
  "I do this without negotiating with myself.",
  "The cue is obvious in my environment.",
  "Missing it feels noticeable.",
  "The habit supports the identity I want.",
  "I can maintain it on a difficult day.",
];

/**
 * FormationQuestionnaire — five-question induction modal that decides
 * whether a habit graduates into the Hall of Fame. Users rate each
 * question 1–5; the average score drives a recommendation copy and the
 * two action buttons remain disabled until every question is rated.
 */
export function FormationQuestionnaire({
  habit,
  onClose,
  onSubmit,
}: {
  habit: Habit;
  onClose: () => void;
  onSubmit: (verdict: FormationVerdict) => void;
}) {
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [reflection, setReflection] = useState("");

  // True once the user has rated all five questions.
  const complete = QUESTIONS.every((_, index) => ratings[index]);

  // Memoised average across rated questions.
  const score = useMemo(() => {
    const values = Object.values(ratings);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }, [ratings]);

  // Copy beneath the score — encourages or discourages induction.
  const recommendation =
    score >= 4
      ? "This sounds like a habit that has truly formed."
      : "This habit may need a cleaner cue or a smaller version before induction.";

  const submit = (formed: boolean) => {
    if (!complete) return;
    onSubmit({
      habitId: habit.id,
      score: Number(score.toFixed(1)),
      reflection,
      formed,
      reviewedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="overlay">
      <div className={`overlay-card ${styles.card}`}>
        <div className={styles.header}>
          <div>
            <div className="eyebrow">Formation review</div>
            <h2 className={`h2 ${styles.title}`}>{habit.name}</h2>
          </div>
          <button className="btn btn-sm" onClick={onClose}>Close</button>
        </div>

        <div className={styles.questions}>
          {QUESTIONS.map((question, index) => (
            <div key={question}>
              <div className="field-label">{question}</div>
              <div className={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    className={`btn btn-sm ${ratings[index] === value ? "btn-primary" : ""}`}
                    onClick={() => setRatings((current) => ({ ...current, [index]: value }))}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <label className={`field-label ${styles.reflectionLabel}`}>Reflection</label>
        <textarea
          className="input"
          rows={4}
          value={reflection}
          onChange={(event) => setReflection(event.target.value)}
          placeholder="What made it automatic?"
        />

        <div className={`card card-pad ${styles.recommendation}`}>
          <div className={`mono muted ${styles.recommendationScore}`}>
            AVERAGE SCORE {score.toFixed(1)}
          </div>
          <div className={styles.recommendationText}>{recommendation}</div>
        </div>

        <div className={styles.actions}>
          <button className="btn" disabled={!complete} onClick={() => submit(false)}>
            Keep in progress
          </button>
          <button className="btn btn-primary" disabled={!complete} onClick={() => submit(true)}>
            Induct to Hall of Fame
          </button>
        </div>
      </div>
    </div>
  );
}
