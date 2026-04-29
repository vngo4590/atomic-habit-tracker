"use client";

import { useMemo, useState } from "react";

import type { Habit } from "@/lib/types";

const QUESTIONS = [
  "I do this without negotiating with myself.",
  "The cue is obvious in my environment.",
  "Missing it feels noticeable.",
  "The habit supports the identity I want.",
  "I can maintain it on a difficult day.",
];

export interface FormationVerdict {
  habitId: number;
  score: number;
  reflection: string;
  formed: boolean;
  reviewedAt: string;
}

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
  const complete = QUESTIONS.every((_, index) => ratings[index]);
  const score = useMemo(() => {
    const values = Object.values(ratings);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }, [ratings]);
  const recommendation = score >= 4
    ? "This sounds like a habit that has truly formed."
    : "This habit may need a cleaner cue or a smaller version before induction.";

  const submit = (formed: boolean) => {
    if (!complete) {
      return;
    }
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
      <div className="overlay-card" style={{ width: 640, maxWidth: "92vw" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div className="eyebrow">Formation review</div>
            <h2 className="h2" style={{ marginTop: 6 }}>{habit.name}</h2>
          </div>
          <button className="btn btn-sm" onClick={onClose}>Close</button>
        </div>
        <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
          {QUESTIONS.map((question, index) => (
            <div key={question}>
              <div className="field-label">{question}</div>
              <div style={{ display: "flex", gap: 6 }}>
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
        <label className="field-label" style={{ marginTop: 16 }}>Reflection</label>
        <textarea className="input" rows={4} value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="What made it automatic?" />
        <div className="card card-pad" style={{ background: "var(--bg-sunk)", marginTop: 14 }}>
          <div className="mono muted" style={{ fontSize: 11 }}>AVERAGE SCORE {score.toFixed(1)}</div>
          <div style={{ marginTop: 6 }}>{recommendation}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button className="btn" disabled={!complete} onClick={() => submit(false)}>Keep in progress</button>
          <button className="btn btn-primary" disabled={!complete} onClick={() => submit(true)}>Induct to Hall of Fame</button>
        </div>
      </div>
    </div>
  );
}
