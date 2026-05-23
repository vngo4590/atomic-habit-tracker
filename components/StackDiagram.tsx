"use client";

import { useMemo, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { useRouter } from "next/navigation";

import { Modal } from "@/components/Modal";
import { useStoreContext } from "@/components/StoreProvider";
import { getStackChain, isInStack } from "@/lib/stack";
import type { Habit } from "@/lib/types";

/**
 * Maximum number of standalone habits the picker shows by default. When the
 * filtered list exceeds this cap the user is offered two ways to find more:
 *   1. Narrow the list with the search input, or
 *   2. Expand the picker to reveal every remaining option.
 *
 * Exported so tests can reference the same constant.
 */
export const STACK_PICKER_DEFAULT_LIMIT = 10;

/* -------------------------------------------------------------------------- */
/* StackChipItem — extracted child so useDragControls() is safe per-item.     */
/* -------------------------------------------------------------------------- */

/**
 * A single draggable chip in the stack chain. Uses a dedicated drag handle
 * (grip icon) so that horizontal scrolling on the container doesn't
 * accidentally trigger reorder. The handle is the only element that starts a
 * drag via Framer Motion's `dragControls`.
 */
function StackChipItem({
  h,
  isCurrent,
  isLast,
  onChipClick,
  onNodeRemove,
  onDragEnd,
}: {
  h: Habit;
  isCurrent: boolean;
  isLast: boolean;
  onChipClick: (id: string) => void;
  onNodeRemove: (id: string) => void;
  onDragEnd: () => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      key={h.id}
      value={h}
      data-testid={`stack-chip-item-${h.id}`}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
    >
      {/* Drag handle — the only element that triggers reorder drag */}
      <button
        type="button"
        className="stack-drag-handle"
        aria-label={`Drag ${h.name} to reorder`}
        onPointerDown={(event) => {
          event.preventDefault();
          dragControls.start(event);
        }}
        data-testid={`stack-chip-drag-${h.id}`}
      >
        <svg
          width="10"
          height="16"
          viewBox="0 0 10 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="3" cy="3" r="1.5" />
          <circle cx="7" cy="3" r="1.5" />
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="7" cy="8" r="1.5" />
          <circle cx="3" cy="13" r="1.5" />
          <circle cx="7" cy="13" r="1.5" />
        </svg>
      </button>
      <div
        data-testid="stack-chain-chip"
        data-chip-id={h.id}
        className="chip"
        style={{
          borderColor: isCurrent ? "var(--accent)" : "var(--rule)",
          background: isCurrent
            ? "color-mix(in oklch, var(--accent) 12%, var(--bg-elev))"
            : "var(--bg-sunk)",
          fontSize: 13,
          padding: "2px 4px 2px 8px",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <button
          type="button"
          data-testid={`stack-chip-link-${h.id}`}
          onClick={() => onChipClick(h.id)}
          aria-label={isCurrent ? `Current: ${h.name}` : `Open ${h.name}`}
          style={{
            all: "unset",
            cursor: isCurrent ? "default" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 0",
          }}
        >
          <span>{h.emoji}</span>
          <span>{h.name}</span>
        </button>
        <button
          type="button"
          aria-label={`Remove ${h.name} from stack`}
          data-testid={`stack-chip-remove-${h.id}`}
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            void onNodeRemove(h.id);
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          style={{
            all: "unset",
            marginLeft: 2,
            width: 18,
            height: 18,
            borderRadius: 9,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            lineHeight: 1,
            color: "var(--ink-3)",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
      {!isLast && (
        <span style={{ color: "var(--ink-3)", fontSize: 14, marginLeft: 4 }}>→</span>
      )}
    </Reorder.Item>
  );
}

/**
 * Visual diagram + editor for a habit's stack chain. Rendered in the Stack tab
 * of the habit detail page.
 *
 * Chain chip interaction model:
 *   - Each chip is **clickable** and navigates to that habit's detail page
 *     via `router.push`. Because we don't replace history, the habit detail
 *     back button (which uses `router.back()`) walks through visited chain
 *     habits in reverse order.
 *   - Each chip has an **× button** that removes only that habit from the
 *     chain. Neighbors are re-linked automatically via `stackRemovePatches`.
 *   - Chips are **draggable horizontally** via Framer Motion's
 *     `Reorder.Group` / `Reorder.Item`. On drag-end we commit the new order
 *     via `applyStackMutation({ kind: "reorder", habitIds })`. A
 *     `wasDragged` ref suppresses the click handler when a real drag
 *     occurred so users don't navigate away by accident.
 *
 * All mutations route through `store.applyStackMutation`, which is atomic on
 * the server (cycle / exclusivity / set-equality validation + transactional
 * patch application). Any error opens a `Modal` so the user knows the
 * operation was cancelled and must acknowledge before continuing.
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
  const router = useRouter();
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  const [linkMode, setLinkMode] = useState<"before" | "after" | null>(null);
  const [query, setQuery] = useState("");
  // When the filtered list exceeds the default limit the picker collapses to
  // the first N entries; the user can expand to see the rest.
  const [expanded, setExpanded] = useState(false);

  const chain = useMemo(() => getStackChain(habit, habits), [habit, habits]);
  const position = useMemo(() => chain.findIndex((h) => h.id === habit.id) + 1, [chain, habit]);

  // Local ordered chain state used by Reorder.Group during a drag. We re-sync
  // it whenever the chain identity changes (server confirmation, navigation
  // to a different habit, etc.) using React's "storing information from
  // previous renders" pattern — a render-time conditional setState that
  // compares against another piece of state. This avoids the
  // cascading-renders pitfall of doing the sync inside useEffect.
  const chainKey = chain.map((h) => h.id).join("|");
  const [prevChainKey, setPrevChainKey] = useState(chainKey);
  const [orderedChain, setOrderedChain] = useState<Habit[]>(chain);
  if (prevChainKey !== chainKey) {
    setPrevChainKey(chainKey);
    setOrderedChain(chain);
  }

  // Tracks whether a real drag occurred between pointerdown and click. Used
  // to suppress chip navigation right after a successful drag, so users
  // don't accidentally jump to the dragged habit's detail page.
  const wasDraggedRef = useRef(false);

  /**
   * Whether the current habit is itself standalone (no successor, no
   * predecessor). When true, the picker semantics flip — see
   * `availableHabits` and `handleLink` below.
   */
  const currentIsSolo = useMemo(() => !isInStack(habit, habits), [habit, habits]);

  /**
   * Picker behaviour is **symmetric** based on the current habit's state:
   *
   *   - Current habit is in a chain: picker lists every other **standalone**
   *     habit. Picking one inserts that standalone before/after the anchor
   *     (current) inside the existing chain.
   *
   *   - Current habit is standalone: picker lists **every other habit** —
   *     chain members and standalones alike. Picking one means the current
   *     standalone joins that habit's chain (when picked is in a chain), or
   *     forms a new 2-chain anchored on current (when picked is also solo).
   *
   * In both cases the *inserted* habit (the source of the mutation) is
   * always a solo — the server enforces this.
   */
  const availableHabits = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return habits
      .filter((h) => {
        if (h.id === habit.id) return false;
        // When the current habit is itself solo, the user can pick any
        // other habit to anchor against — including chain members.
        if (currentIsSolo) return true;
        // Otherwise only standalone habits are valid picks.
        return !isInStack(h, habits);
      })
      .filter((h) => {
        if (!trimmed) return true;
        const haystack = `${h.name} ${h.identity} ${h.cue}`.toLowerCase();
        return haystack.includes(trimmed);
      });
  }, [habits, habit, query, currentIsSolo]);

  /**
   * Slice the filtered list to the default limit unless the user has expanded
   * the picker. Searching narrows the list naturally and resets the expansion
   * (handled in the search input's onChange).
   */
  const visibleHabits = useMemo(
    () => (expanded ? availableHabits : availableHabits.slice(0, STACK_PICKER_DEFAULT_LIMIT)),
    [availableHabits, expanded],
  );
  const hiddenCount = availableHabits.length - visibleHabits.length;

  const closeError = () => setErrorModal(null);

  /**
   * Insert mutation arguments depend on which side is in a chain (the
   * server requires the inserted habit `habitId` to be solo):
   *
   *   - Picked habit is in a chain → current must be solo (per the picker
   *     filter). Current joins the picked's chain at the chosen position.
   *     `{ habitId: current, targetId: picked }`.
   *
   *   - Picked habit is solo → keep the natural reading: the picked solo
   *     is inserted before/after the current anchor. This branch covers
   *     both "current is in a chain + picks a solo" and the symmetric
   *     "current solo + picks another solo" case (the user expects the
   *     button label to mean "Link [picked] before/after [me]" in that
   *     mirror-image scenario).
   *     `{ habitId: picked, targetId: current }`.
   */
  const handleLink = async (selectedId: string) => {
    if (!linkMode) return;
    const mode = linkMode;
    setLinkMode(null);
    setQuery("");
    setExpanded(false);

    const picked = habits.find((h) => h.id === selectedId);
    const pickedIsInChain = picked ? isInStack(picked, habits) : false;
    const insertArgs = pickedIsInChain
      ? { kind: "insert" as const, habitId: habit.id, position: mode, targetId: selectedId }
      : { kind: "insert" as const, habitId: selectedId, position: mode, targetId: habit.id };

    try {
      await store.applyStackMutation(insertArgs);
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

  /**
   * Per-chip remove. Calls applyStackMutation for that specific habit's id
   * (NOT necessarily the current habit). The repository's stackRemovePatches
   * handles re-linking neighbors so the rest of the chain stays intact.
   */
  const handleNodeRemove = async (nodeId: string) => {
    try {
      await store.applyStackMutation({ kind: "remove", habitId: nodeId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Couldn't remove the habit from the stack.";
      setErrorModal({ title: "Couldn't remove from stack", message });
    }
  };

  /**
   * Navigate to a chip's habit detail page. Skipped for the current habit
   * (no-op) and when a real drag just occurred.
   */
  const handleChipClick = (nodeId: string) => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }
    if (nodeId === habit.id) return;
    router.push(`/habits/${nodeId}`);
  };

  /**
   * Commit a drag-reorder. Called when the user releases a dragged chip and
   * the local order differs from the server's chain order. Falls back to the
   * server-confirmed chain on rejection.
   */
  const commitReorder = async (nextChain: Habit[]) => {
    const nextIds = nextChain.map((h) => h.id);
    const currentIds = chain.map((h) => h.id);
    const sameOrder = nextIds.length === currentIds.length && nextIds.every((id, i) => id === currentIds[i]);
    if (sameOrder) return;

    try {
      await store.applyStackMutation({ kind: "reorder", habitIds: nextIds });
    } catch (error: unknown) {
      // Roll back local order on rejection.
      setOrderedChain(chain);
      const message = error instanceof Error ? error.message : "Couldn't reorder the stack.";
      setErrorModal({ title: "Couldn't reorder the stack", message });
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
          <Reorder.Group
            axis="x"
            values={orderedChain}
            onReorder={(next) => {
              wasDraggedRef.current = true;
              setOrderedChain(next);
            }}
            data-testid="stack-chain-list"
            className="stack-chain-list"
          >
            {orderedChain.map((h, index) => (
              <StackChipItem
                key={h.id}
                h={h}
                isCurrent={h.id === habit.id}
                isLast={index === orderedChain.length - 1}
                onChipClick={handleChipClick}
                onNodeRemove={handleNodeRemove}
                onDragEnd={() => {
                  void commitReorder(orderedChain);
                  setTimeout(() => {
                    wasDraggedRef.current = false;
                  }, 0);
                }}
              />
            ))}
          </Reorder.Group>
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
            onChange={(event) => {
              setQuery(event.target.value);
              // A new search resets the expansion so the user always sees a
              // focused result set first.
              setExpanded(false);
            }}
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
                ? "No habits match your search."
                : currentIsSolo
                  ? "No other habits exist yet. Create another habit to start a stack."
                  : "No standalone habits available. Remove a habit from its stack to make it selectable."}
            </div>
          ) : (
            <>
              <div
                style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 220, overflowY: "auto" }}
                data-testid="stack-link-options"
              >
                {visibleHabits.map((h) => (
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
              {hiddenCount > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ marginTop: 8 }}
                  data-testid="stack-link-show-all"
                  onClick={() => setExpanded(true)}
                  aria-expanded={false}
                >
                  Show all {availableHabits.length} habits ({hiddenCount} more) — or refine with search
                </button>
              )}
              {expanded && availableHabits.length > STACK_PICKER_DEFAULT_LIMIT && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ marginTop: 8 }}
                  data-testid="stack-link-show-less"
                  onClick={() => setExpanded(false)}
                  aria-expanded={true}
                >
                  Show less (first {STACK_PICKER_DEFAULT_LIMIT})
                </button>
              )}
            </>
          )}
          <button
            className="btn btn-sm btn-ghost"
            style={{ marginTop: 10 }}
            onClick={() => {
              setLinkMode(null);
              setQuery("");
              setExpanded(false);
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
