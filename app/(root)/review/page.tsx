"use client";

import { useMemo, useState } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { dateAdd, fmt, todayKey } from "@/lib/helpers";

const QUESTIONS = [
  "What went well? Why?",
  "What didn't? What's the smallest fix?",
  "Who did I vote to become this week?",
];

export default function ReviewPage() {
  const { habits, completionRate, showToast, weeklyReview, setWeeklyReview } = useStoreContext();
  const [answers, setAnswers] = useState(weeklyReview);
  const today = todayKey();
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => dateAdd(today, index - 6)), [today]);
  const weekStartKey = days[0];
  const questionFields = ["wentWell", "smallestFix", "identityVote"] as const;

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

  return (
    <div className="fade-up">
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
              <div key={day} style={{ minHeight: 132, background: "var(--bg-sunk)", border: "1px solid var(--rule)", borderRadius: 8, padding: 12, display: "grid", alignContent: "space-between" }}>
                <div>
                  <div className="mono muted" style={{ fontSize: 10 }}>{fmt.weekday(day)}</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 24 }}>{day.slice(-2)}</div>
                </div>
                <div>
                  <div style={{ height: 72, display: "flex", alignItems: "end" }}>
                    <div style={{ width: "100%", height: `${Math.max(4, pct)}%`, background: "var(--accent)", borderRadius: 4 }} />
                  </div>
                  <div className="mono muted" style={{ fontSize: 10, marginTop: 6 }}>{pct}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <section className="card card-pad">
          <div className="eyebrow">Wins</div>
          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            {wins.length ? wins.map((habit) => (
              <div key={habit.id}>
                <div className="habit-name">{habit.name}</div>
                <div className="muted mono" style={{ fontSize: 11 }}>{Math.round(completionRate(habit, 7) * 100)}% this week</div>
              </div>
            )) : <div className="muted">No habit was 85%+ this week</div>}
          </div>
        </section>
        <section className="card card-pad">
          <div className="eyebrow">Slips</div>
          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            {slips.length ? slips.map((habit) => (
              <div key={habit.id}>
                <div className="habit-name">{habit.name}</div>
                <div className="muted mono" style={{ fontSize: 11 }}>{Math.round(completionRate(habit, 7) * 100)}% this week</div>
              </div>
            )) : <div className="muted">No habit fell below 50% this week</div>}
          </div>
        </section>
      </div>

      <section className="card card-pad">
        <div className="eyebrow">Reflection</div>
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
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button className="btn btn-primary" onClick={() => { setWeeklyReview(weekStartKey, answers); showToast("Weekly review saved", "Reflection captured to your account"); }}>Save review</button>
        </div>
      </section>
    </div>
  );
}
