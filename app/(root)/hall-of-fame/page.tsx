"use client";

import { useMemo, useState } from "react";

import { FormationQuestionnaire } from "@/components/FormationQuestionnaire";
import { useStoreContext } from "@/components/StoreProvider";
import { todayKey } from "@/lib/helpers";
import type { FormationVerdict, Habit } from "@/lib/types";

const FORMATION_DAYS = 66;

function daysSince(dateKey: string) {
  const start = new Date(`${dateKey}T00:00:00`);
  const end = new Date(`${todayKey()}T00:00:00`);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}

export default function HallOfFamePage() {
  const { habits, longestStreak, completionRate, formationVerdicts: verdicts, saveFormationVerdict } = useStoreContext();
  const [reviewing, setReviewing] = useState<Habit | null>(null);
  const reviewedIds = new Set(verdicts.map((verdict) => verdict.habitId));

  const ready = habits.filter((habit) => daysSince(habit.createdAt) >= FORMATION_DAYS && !reviewedIds.has(habit.id));
  const inProgress = habits.filter((habit) => daysSince(habit.createdAt) < FORMATION_DAYS && !reviewedIds.has(habit.id));
  const inducted = useMemo(
    () => verdicts.filter((verdict) => verdict.formed).map((verdict) => ({ verdict, habit: habits.find((habit) => habit.id === verdict.habitId) })).filter((item) => item.habit),
    [habits, verdicts],
  );

  const saveVerdict = (verdict: FormationVerdict) => {
    saveFormationVerdict(verdict);
    setReviewing(null);
  };

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="eyebrow">Become</div>
          <h1 className="h1">Hall of <em>Fame</em></h1>
        </div>
      </div>

      <section className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="eyebrow">Ready for review</div>
        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          {ready.length ? ready.map((habit) => (
            <div key={habit.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
              <div>
                <div className="habit-name">{habit.name}</div>
                <div className="muted mono" style={{ fontSize: 11 }}>{daysSince(habit.createdAt)} days old · {habit.identity}</div>
              </div>
              <button className="btn btn-primary" onClick={() => setReviewing(habit)}>Review</button>
            </div>
          )) : <div className="muted">No habits have reached 66 days yet.</div>}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <section className="card card-pad">
          <div className="eyebrow">Inducted</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
            {inducted.length ? inducted.map(({ verdict, habit }) => habit && (
              <div key={verdict.habitId} className="card card-pad" style={{ background: "var(--bg-sunk)" }}>
                <div className="habit-name">{habit.name}</div>
                <div className="muted mono" style={{ fontSize: 11, marginTop: 5 }}>SCORE {verdict.score} · BEST {longestStreak(habit)}D</div>
                <div className="muted mono" style={{ fontSize: 11, marginTop: 3 }}>{Math.round(completionRate(habit) * 100)}% adherence</div>
              </div>
            )) : <div className="muted">No inducted habits yet.</div>}
          </div>
        </section>

        <section className="card card-pad">
          <div className="eyebrow">In progress</div>
          <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
            {inProgress.map((habit) => {
              const age = daysSince(habit.createdAt);
              const pct = Math.round((age / FORMATION_DAYS) * 100);
              return (
                <div key={habit.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div className="habit-name">{habit.name}</div>
                    <div className="mono muted" style={{ fontSize: 11 }}>{age}/{FORMATION_DAYS}</div>
                  </div>
                  <div style={{ height: 6, background: "var(--bg-sunk)", borderRadius: 99, overflow: "hidden", marginTop: 7 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {reviewing && <FormationQuestionnaire habit={reviewing} onClose={() => setReviewing(null)} onSubmit={saveVerdict} />}
    </div>
  );
}
