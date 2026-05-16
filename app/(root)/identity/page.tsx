"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { IconClose } from "@/components/Icons";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerContainer";
import { useStoreContext } from "@/components/StoreProvider";

export default function IdentityPage() {
  const { habits, identity, setIdentity } = useStoreContext();
  const [editingStatement, setEditingStatement] = useState(false);
  const [statementDraft, setStatementDraft] = useState(identity.statement);
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

  const removeValue = (value: string) => {
    setIdentity({ ...identity, values: identity.values.filter((item) => item !== value) });
  };

  const saveStatement = () => {
    if (statementDraft !== identity.statement) {
      setIdentity({ ...identity, statement: statementDraft });
    }
    setEditingStatement(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}>
      <div className="page-header">
        <div>
          <div className="eyebrow">Become</div>
          <h1 className="h1">Identity</h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 18 }}>
        <section className="card card-pad">
          <div className="eyebrow">Statement</div>
          {editingStatement ? (
            <>
              <textarea
                className="input"
                rows={6}
                value={statementDraft}
                onChange={(event) => setStatementDraft(event.target.value)}
                style={{ marginTop: 12, fontFamily: "var(--serif)", fontSize: 22, lineHeight: 1.45 }}
                autoFocus
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                <button className="btn btn-sm" onClick={() => { setStatementDraft(identity.statement); setEditingStatement(false); }}>
                  Cancel
                </button>
                <button className="btn btn-sm btn-primary" onClick={saveStatement}>
                  Save statement
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => {
                setStatementDraft(identity.statement);
                setEditingStatement(true);
              }}
              style={{
                display: "block",
                width: "100%",
                marginTop: 12,
                padding: 0,
                border: 0,
                background: "transparent",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              {identity.statement.trim() ? (
                <>
                  <div style={{ marginBottom: 8, fontFamily: "var(--serif)", fontSize: 13, fontStyle: "italic", color: "var(--ink-3)" }}>
                    Click the statement to edit it.
                  </div>
                  <p style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic", lineHeight: 1.35, color: "var(--ink)" }}>
                    {identity.statement}
                  </p>
                </>
              ) : (
                <p style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", lineHeight: 1.45, color: "var(--ink-3)" }}>
                  No identity statement yet. Click this section to write one.
                </p>
              )}
            </button>
          )}
          <div className="eyebrow" style={{ marginTop: 22 }}>Core values</div>
          <StaggerContainer style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }} staggerDelay={0.03}>
            {identity.values.map((value) => (
              <StaggerItem key={value}>
                <motion.button className="chip active" aria-label={`Remove core value ${value}`} onClick={() => removeValue(value)} whileTap={{ scale: 0.95 }}>
                  <span>{value}</span>
                  <IconClose style={{ width: 11, height: 11 }} />
                </motion.button>
              </StaggerItem>
            ))}
            <input className="input" value={newValue} onChange={(event) => setNewValue(event.target.value)} placeholder="+ Add value" style={{ width: 140, height: 32, borderStyle: "dashed" }} onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addValue();
              }
            }} />
            <motion.button className="chip" onClick={addValue} whileTap={{ scale: 0.95 }}>+ Add</motion.button>
          </StaggerContainer>
        </section>

        <section className="card card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div className="eyebrow">Vote ledger</div>
              <h2 className="h3" style={{ marginTop: 6 }}>Evidence by identity</h2>
            </div>
            <div className="mono muted" style={{ fontSize: 11 }}>{total} TOTAL</div>
          </div>
          <StaggerContainer style={{ display: "grid", gap: 16, marginTop: 18 }} staggerDelay={0.05}>
            {ledger.map(([label, votes]) => (
              <StaggerItem key={label}>
                <motion.div whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                    <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18 }}>I am {label}</div>
                    <div className="mono" style={{ fontSize: 12 }}>{votes}</div>
                  </div>
                  <div style={{ height: 7, borderRadius: 99, overflow: "hidden", background: "var(--bg-sunk)", marginTop: 7 }}>
                    <motion.div
                      style={{ height: "100%", background: "var(--accent)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((votes / max) * 100)}%` }}
                      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      </div>
    </motion.div>
  );
}
