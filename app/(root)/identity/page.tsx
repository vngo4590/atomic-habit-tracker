"use client";

import { useMemo, useState } from "react";

import { useStoreContext } from "@/components/StoreProvider";

export default function IdentityPage() {
  const { habits, identity, setIdentity } = useStoreContext();
  const [newValue, setNewValue] = useState("");

  const ledger = useMemo(() => {
    const tally = new Map<string, number>();
    habits.forEach((habit) => {
      const votes = Object.keys(habit.history).filter((key) => Boolean(habit.history[key])).length;
      tally.set(habit.identity, (tally.get(habit.identity) ?? 0) + votes);
    });
    return Array.from(tally.entries()).sort((a, b) => b[1] - a[1]);
  }, [habits]);

  const total = ledger.reduce((sum, [, votes]) => sum + votes, 0);
  const max = Math.max(1, ...ledger.map(([, votes]) => votes));

  const addValue = () => {
    const value = newValue.trim();
    if (!value || identity.values.includes(value)) {
      return;
    }
    setIdentity({ ...identity, values: [...identity.values, value] });
    setNewValue("");
  };

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="eyebrow">Become</div>
          <h1 className="h1">Identity</h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 18 }}>
        <section className="card card-pad">
          <div className="eyebrow">Statement</div>
          <textarea
            className="input"
            rows={6}
            value={identity.statement}
            onChange={(event) => setIdentity({ ...identity, statement: event.target.value })}
            style={{ marginTop: 12, fontFamily: "var(--serif)", fontSize: 22, lineHeight: 1.45 }}
          />
          <div className="eyebrow" style={{ marginTop: 22 }}>Core values</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {identity.values.map((value) => <span key={value} className="chip active">{value}</span>)}
            <input className="input" value={newValue} onChange={(event) => setNewValue(event.target.value)} placeholder="+ Add value" style={{ width: 140, height: 32, borderStyle: "dashed" }} onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addValue();
              }
            }} />
            <button className="chip" onClick={addValue}>+ Add</button>
          </div>
        </section>

        <section className="card card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div className="eyebrow">Vote ledger</div>
              <h2 className="h3" style={{ marginTop: 6 }}>Evidence by identity</h2>
            </div>
            <div className="mono muted" style={{ fontSize: 11 }}>{total} TOTAL</div>
          </div>
          <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
            {ledger.map(([label, votes]) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                  <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18 }}>I am {label}</div>
                  <div className="mono" style={{ fontSize: 12 }}>{votes}</div>
                </div>
                <div style={{ height: 7, borderRadius: 99, overflow: "hidden", background: "var(--bg-sunk)", marginTop: 7 }}>
                  <div style={{ width: `${Math.round((votes / max) * 100)}%`, height: "100%", background: "var(--accent)" }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
