"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import {
  getStackHabits,
  stackInsertPatches,
  stackRemovePatches,
  validateStackPatches,
  wouldCreateCycle,
} from "@/lib/stack";
import type { Habit } from "@/lib/types";

/**
 * The Stack tab lets the user link the current habit before or after another
 * existing habit, forming a linear chain. Habits in a chain are revealed
 * sequentially on the Today page — once the first is done, the next appears.
 *
 * The UI shows:
 * - The current stack chain as a visual diagram (if any)
 * - A habit selector + Before/After toggle to add the current habit to a chain
 * - Circular-dependency prevention with a clear error message
 * - A Remove button to detach the habit from its stack
 */

export function StackTab({
  habit,
  habits,
  onUpdateHabit,
}: {
  habit: Habit;
  habits: Habit[];
  onUpdateHabit: (id: string, patch: Partial<Habit>) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [position, setPosition] = useState<"before" | "after">("after");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Other habits that can be linked (exclude the current habit)
  const linkableHabits = useMemo(
    () => habits.filter((h) => h.id !== habit.id),
    [habits, habit.id],
  );

  // Current stack chain for this habit (if any)
  const chain = useMemo(() => getStackHabits(habit.id, habits), [habit.id, habits]);
  const isInStack = chain.length > 1;

  // Check if the proposed link would create a cycle
  const cycleError = useMemo(() => {
    if (!selectedId) return null;
    const target = habits.find((h) => h.id === selectedId);
    if (!target) return null;

    if (wouldCreateCycle(habit.id, selectedId, habits)) {
      return `Linking would create a loop. ${target.name} is already part of this habit's chain.`;
    }
    return null;
  }, [selectedId, habit.id, habits]);

  const canLink = selectedId && !cycleError;

  const handleLink = () => {
    if (!canLink) return;
    const patches = stackInsertPatches(habit.id, selectedId, position, habits);

    // Defensive check: ensure no habit ends up with more than one successor.
    // If the data was already in a bad state, we auto-correct and tell the user.
    const { patches: validPatches, messages } = validateStackPatches(habits, patches);

    if (messages.length > 0) {
      setValidationMessage(messages.join(" "));
    } else {
      setValidationMessage(null);
    }

    validPatches.forEach((patch, id) => {
      onUpdateHabit(id, patch);
    });
    setSelectedId("");
  };

  const handleRemove = () => {
    const patches = stackRemovePatches(habit.id, habits);
    patches.forEach((patch, id) => {
      onUpdateHabit(id, patch);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Current stack diagram */}
      {isInStack && (
        <div className="card card-pad">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Current stack</div>
          <StackDiagram chain={chain} highlightId={habit.id} />
          <div style={{ marginTop: 16 }}>
            <motion.button className="btn btn-sm btn-ghost btn-danger-ghost" onClick={handleRemove} whileTap={{ scale: 0.97 }}>
              Remove from stack
            </motion.button>
          </div>
        </div>
      )}

      {/* Link to another habit */}
      <div className="card card-pad">
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          {isInStack ? "Change stack position" : "Link to another habit"}
        </div>

        {linkableHabits.length === 0 ? (
          <p style={{ margin: 0, fontFamily: "var(--serif)", fontStyle: "italic", color: "var(--ink-3)" }}>
            You need at least one other habit to create a stack.
          </p>
        ) : (
          <>
            <label className="field-label">Select a habit</label>
            <select
              className="input"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={{ marginBottom: 12 }}
            >
              <option value="">— Choose a habit —</option>
              {linkableHabits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>

            <label className="field-label">Position</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                className={`chip ${position === "before" ? "active" : ""}`}
                onClick={() => setPosition("before")}
                type="button"
              >
                Before
              </button>
              <button
                className={`chip ${position === "after" ? "active" : ""}`}
                onClick={() => setPosition("after")}
                type="button"
              >
                After
              </button>
            </div>

            {cycleError && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "var(--bg-sunk)",
                  color: "var(--danger)",
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                {cycleError}
              </div>
            )}

            {validationMessage && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "var(--bg-sunk)",
                  color: "var(--accent)",
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                {validationMessage}
              </div>
            )}

            <motion.button
              className="btn btn-primary btn-sm"
              onClick={handleLink}
              disabled={!canLink}
              whileTap={{ scale: 0.97 }}
            >
              {isInStack ? "Update stack" : "Link habits"}
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * A horizontal diagram showing the habit stack chain.
 * The currently-viewed habit is highlighted in accent colour.
 */
function StackDiagram({ chain, highlightId }: { chain: Habit[]; highlightId: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {chain.map((h, index) => (
        <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {index > 0 && (
            <span className="mono" style={{ fontSize: 14, color: "var(--ink-3)" }}>
              →
            </span>
          )}
          <div
            className="chip"
            style={{
              fontSize: 13,
              background: h.id === highlightId ? "var(--accent-soft)" : "var(--bg-sunk)",
              color: h.id === highlightId ? "var(--accent)" : "var(--ink-2)",
              borderColor: h.id === highlightId ? "var(--accent)" : "var(--rule-strong)",
              fontWeight: h.id === highlightId ? 600 : 400,
            }}
          >
            {h.emoji} {h.name}
          </div>
        </div>
      ))}
    </div>
  );
}
