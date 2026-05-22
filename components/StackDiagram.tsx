"use client";

import { useMemo, useState } from "react";

import { Modal } from "@/components/Modal";
import { useStoreContext } from "@/components/StoreProvider";
import { getStackChain, isInStack } from "@/lib/stack";
import type { Habit } from "@/lib/types";

/**
 * Visual diagram + editor for a habit's stack chain. Rendered in the Stack tab
 * of the habit detail page.
 *
 * Selection semantics (relaxed):
 *   - The **current habit** (the one whose Stack tab is open) is the anchor —
 *     it can be solo OR anywhere in an existing chain (top, middle, bottom).
 *   - The **picker** lists only **standalone** habits — habits that are not
 *     yet part of any stack. They are the habits eligible to be added.
 *   - Tapping "Link before" or "Link after" then choosing a standalone habit
 *     inserts that standalone into the chain immediately before or after the
 *     current habit. The chain reorders accordingly.
 *   - The picker supports search filtering by name, identity, or cue.
 *
 * All mutations route through `store.applyStackMutation`, which is atomic on
 * the server (cycle / exclusivity validation + transactional patch
 * application). Any error opens a `Modal` so the user knows the operation
 * was cancelled and must acknowledge before continuing.
 */
export function StackDiagram({
  habit,
  habits,
  onUpdate,
}: {
  habit: Habit;
  habits: Habit[];
  /** Legacy prop preserved for tests; current code path uses store.applyStackMutation. */
  onUpdate?: (id: string, patch: Partial<Habit>) => void;
}) {
  const store = useStoreContext();
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  const [linkMode, setLinkMode] = useState<"before" | "after" | null>(null);
  const [query, setQuery] = useState("");

  const chain = useMemo(() => getStackChain(habit, habits), [habit, habits]);
  const position = useMemo(() => chain.findIndex((h) => h.id === habit.id) + 1, [chain, habit]);

  /**
   * The picker lists every habit that is **not** already in a stack and is
   * not the current habit itself. Those are the standalone habits the user
   * may insert before/after the current habit, which acts as the anchor.
   */
  const availableHabits = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return habits
      .filter((h) => h.id !== habit.id && !isInStack(h, habits))
      .filter((h) => {
        if (!trimmed) return true;
        const haystack = `${h.name} ${h.identity} ${h.cue}`.toLowerCase();
        return haystack.includes(trimmed);
      });
  }, [habits, habit, query]);

  const closeError = () => setErrorModal(null);

  /**
   * Insert the chosen standalone habit before or after the current (anchor)
   * habit. The picker only offers standalone habits, so the source of the
   * insert is guaranteed solo at click time. The anchor may live anywhere in
   * an existing chain — `applyStackMutation` resolves neighbours and reorders.
   */
  const handleLink = async (selectedSoloId: string) => {
    if (!linkMode) return;
    const mode = linkMode;
    setLinkMode(null);
    setQuery("");

    try {
      await store.applyStackMutation({
        kind: "insert",
        habitId: selectedSoloId,
        position: mode,
        targetId: habit.id,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Couldn't update the stack.";
      setErrorModal({ title: "Couldn't update the stack", message });
    }
  };

  const handleRemove = async () => {
    try {
      await store.applyStackMutation({ kind: "remove", habitId: habit.id });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Couldn't remove the habit from the stack.";
      setErrorModal({ title: "Couldn't remove from stack", message });
    }
  };

  // Legacy support: if a test still passes onUpdate, treat it as a no-op
  // alongside the real mutation. This keeps existing tests rendering without
  // throwing while the new tests target the store directly.
  void onUpdate;

  return (
    <div className="card card-pad" data-testid="stack-diagram">
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
                  data-testid="stack-chain-chip"
                  style={{
                    borderColor: h.id === habit.id ? "var(--accent)" : "var(--rule)",
                    background:
                      h.id === habit.id
                        ? "color-mix(in oklch, var(--accent) 12%, var(--bg-elev))"
                        : "var(--bg-sunk)",
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

      {linkMode ? (
        <div style={{ marginTop: 10 }} data-testid="stack-link-picker">
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Select a habit to link {linkMode}:
          </div>
          <input
            type="search"
            className="input"
            placeholder="Search habits..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            data-testid="stack-link-search"
            style={{ width: "100%", marginBottom: 10 }}
            aria-label="Search habits to link"
            autoFocus
          />
          {availableHabits.length === 0 ? (
            <div
              className="muted"
              style={{ fontSize: 12.5, padding: "8px 0" }}
              data-testid="stack-link-empty"
            >
              {query.trim()
                ? "No standalone habits match your search."
                : "No standalone habits available. Remove a habit from its stack to make it selectable."}
            </div>
          ) : (
            <div
              style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 220, overflowY: "auto" }}
              data-testid="stack-link-options"
            >
              {availableHabits.map((h) => (
                <button
                  key={h.id}
                  className="chip"
                  data-testid={`stack-link-option-${h.id}`}
                  onClick={() => handleLink(h.id)}
                >
                  <span>{h.emoji}</span>
                  {h.name}
                </button>
              ))}
            </div>
          )}
          <button
            className="btn btn-sm btn-ghost"
            style={{ marginTop: 10 }}
            onClick={() => {
              setLinkMode(null);
              setQuery("");
            }}
          >
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

      <Modal
        open={!!errorModal}
        title={errorModal?.title ?? ""}
        message={errorModal?.message ?? ""}
        onClose={closeError}
        tone="error"
      />
    </div>
  );
}
