"use client";

import { useMemo, useState } from "react";

import { getStackChain, stackInsertPatches, stackRemovePatches, wouldCreateCycle } from "@/lib/stack";
import type { Habit } from "@/lib/types";

export function StackDiagram({
  habit,
  habits,
  onUpdate,
}: {
  habit: Habit;
  habits: Habit[];
  onUpdate: (id: string, patch: Partial<Habit>) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState<"before" | "after" | null>(null);

  const chain = useMemo(() => getStackChain(habit, habits), [habit, habits]);
  const position = useMemo(() => chain.findIndex((h) => h.id === habit.id) + 1, [chain, habit]);

  const availableHabits = useMemo(() => {
    const chainIds = new Set(chain.map((h) => h.id));
    return habits.filter((h) => h.id !== habit.id && !chainIds.has(h.id));
  }, [habits, habit, chain]);

  const handleLink = (targetId: string) => {
    if (!linkMode) return;
    setError(null);

    if (wouldCreateCycle(habit.id, targetId, habits)) {
      setError("This would create a circular stack.");
      setLinkMode(null);
      return;
    }

    const patches = stackInsertPatches(habit.id, linkMode, targetId, habits);
    for (const { id, patch } of patches) {
      onUpdate(id, patch);
    }
    setLinkMode(null);
  };

  const handleRemove = () => {
    setError(null);
    const patches = stackRemovePatches(habit.id, habits);
    for (const { id, patch } of patches) {
      onUpdate(id, patch);
    }
  };

  return (
    <div className="card card-pad">
      {chain.length > 1 ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div className="eyebrow">
              Step {position} of {chain.length}
            </div>
            <button className="btn btn-sm btn-ghost" onClick={handleRemove}>
              Remove from stack
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {chain.map((h, index) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  className="chip"
                  style={{
                    borderColor: h.id === habit.id ? "var(--accent)" : "var(--rule)",
                    background: h.id === habit.id ? "color-mix(in oklch, var(--accent) 12%, var(--bg-elev))" : "var(--bg-sunk)",
                    fontSize: 13,
                    padding: "6px 12px",
                  }}
                >
                  <span>{h.emoji}</span>
                  {h.name}
                </div>
                {index < chain.length - 1 && (
                  <span style={{ color: "var(--ink-3)", fontSize: 14 }}>→</span>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "24px 12px" }}>
          <p style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-3)", fontStyle: "italic" }}>
            This habit is not part of a stack.
          </p>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
            Link it to another habit to build a chain.
          </p>
        </div>
      )}

      {error && (
        <div style={{ color: "oklch(60% 0.12 30)", fontSize: 13, marginBottom: 10 }}>
          {error}
        </div>
      )}

      {linkMode ? (
        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Select a habit to link {linkMode}:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {availableHabits.map((h) => (
              <button key={h.id} className="chip" onClick={() => handleLink(h.id)}>
                <span>{h.emoji}</span>
                {h.name}
              </button>
            ))}
          </div>
          <button className="btn btn-sm btn-ghost" style={{ marginTop: 10 }} onClick={() => { setLinkMode(null); setError(null); }}>
            Cancel
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="btn btn-sm" onClick={() => setLinkMode("after")}>
            Link after…
          </button>
          <button className="btn btn-sm" onClick={() => setLinkMode("before")}>
            Link before…
          </button>
        </div>
      )}
    </div>
  );
}
