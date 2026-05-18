"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import {
  getPredecessor,
  getStackHabits,
  getSuccessor,
  linkStackAfter,
  stackRemovePatches,
  wouldCreateCycle,
} from "@/lib/stack";
import type { Habit } from "@/lib/types";

/**
 * The Stack tab lets the user link the current habit after another existing
 * habit, forming a linear chain. Habits in a chain are revealed sequentially
 * on the Today page — once the first is done, the next appears.
 *
 * The UI shows:
 * - The current stack chain as a visual diagram (if any)
 * - A habit selector to choose which habit this one should stack after
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

  // Other habits that can be linked (exclude the current habit)
  const linkableHabits = useMemo(
    () => habits.filter((h) => h.id !== habit.id),
    [habits, habit.id],
  );

  // Current stack chain for this habit (if any)
  const chain = useMemo(() => getStackHabits(habit.id, habits), [habit.id, habits]);
  const isInStack = chain.length > 1;

  // Determine what message to show for the current selection
  const validation = useMemo(() => {
    if (!selectedId) return { canLink: false, message: null, type: null as "error" | "info" | null };

    const target = habits.find((h) => h.id === selectedId);
    if (!target) return { canLink: false, message: null, type: null };

    // Already stacked directly after this target
    if (habit.stackAfterId === selectedId) {
      return {
        canLink: false,
        message: `This habit is already stacked after ${target.name}.`,
        type: "info" as const,
      };
    }

    // Would create a cycle
    if (wouldCreateCycle(habit.id, selectedId, habits)) {
      return {
        canLink: false,
        message: `Linking would create a loop. ${target.name} is already part of this habit's chain.`,
        type: "error" as const,
      };
    }

    return { canLink: true, message: null, type: null };
  }, [selectedId, habit.id, habit.stackAfterId, habits]);

  const handleLink = () => {
    if (!validation.canLink || !selectedId) return;
    const patches = linkStackAfter(habit.id, selectedId, habits);
    patches.forEach((patch, id) => {
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

  // Show who this habit currently stacks after (if anyone)
  const currentPredecessor = useMemo(() => getPredecessor(habit.id, habits), [habit.id, habits]);
  const currentSuccessor = useMemo(() => getSuccessor(habit.id, habits), [habit.id, habits]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Current stack diagram */}
      {isInStack && (
        <div className="card card-pad">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Current stack</div>
          <StackDiagram chain={chain} highlightId={habit.id} />
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--ink-3)", fontFamily: "var(--serif)", fontStyle: "italic" }}>
            {currentPredecessor && `Stacks after: ${currentPredecessor.emoji} ${currentPredecessor.name}`}
            {currentPredecessor && currentSuccessor && " · "}
            {currentSuccessor && `Followed by: ${currentSuccessor.emoji} ${currentSuccessor.name}`}
          </div>
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
          {isInStack ? "Change stack position" : "Stack after another habit"}
        </div>

        {linkableHabits.length === 0 ? (
          <p style={{ margin: 0, fontFamily: "var(--serif)", fontStyle: "italic", color: "var(--ink-3)" }}>
            You need at least one other habit to create a stack.
          </p>
        ) : (
          <>
            <label className="field-label">Select a habit to stack after</label>
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

            {validation.message && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: validation.type === "error" ? "var(--bg-sunk)" : "var(--bg-sunk)",
                  color: validation.type === "error" ? "var(--danger)" : "var(--ink-3)",
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                {validation.message}
              </div>
            )}

            <motion.button
              className="btn btn-primary btn-sm"
              onClick={handleLink}
              disabled={!validation.canLink}
              whileTap={{ scale: 0.97 }}
            >
              {isInStack ? "Update stack" : "Stack habits"}
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
