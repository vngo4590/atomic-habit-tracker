"use client";

/**
 * Stacks slice of the client store. Stacks have no state of their own — a
 * stack is the `stackNextId` linked list on habits — so this slice patches
 * the habits slice's list through its `setHabits` setter.
 */

import { type Dispatch, type SetStateAction, useCallback, useMemo, useRef } from "react";

import { clientLogger } from "@/lib/logger-client";
import { optimistic } from "@/lib/store/optimistic";
import type { Habit, StoreState } from "@/lib/types";

import { applyStackMutationAction } from "./actions";
import type { StackMutationInput } from "./contracts";
import {
  stackInsertPatches as stackInsertPatchesHelper,
  stackRemovePatches as stackRemovePatchesHelper,
  stackReorderPatches as stackReorderPatchesHelper,
} from "./model/stack";

export type StacksSlice = Pick<StoreState, "applyStackMutation">;

type LinkPatch = { id: string; patch: Partial<Pick<Habit, "stackNextId">> };

function patchesFor(input: StackMutationInput, list: Habit[]): LinkPatch[] {
  if (input.kind === "insert") return stackInsertPatchesHelper(input.habitId, input.position, input.targetId, list);
  if (input.kind === "remove") return stackRemovePatchesHelper(input.habitId, list);
  return stackReorderPatchesHelper(input.habitIds);
}

/** Set `stackNextId` on the listed habits only, leaving every other field (and missing habits) alone. */
function withLinks(habits: Habit[], links: Map<string, string | null>): Habit[] {
  return habits.map((h) => (links.has(h.id) ? { ...h, stackNextId: links.get(h.id) ?? null } : h));
}

export function useStacksSlice(setHabits: Dispatch<SetStateAction<Habit[]>>): StacksSlice {
  // Links as last confirmed by the server (or as they were before any pending
  // request touched them), plus the optimistic links of every request still in
  // flight. The visible link is always confirmed + pending patches in request
  // order, so any mix of late successes and failures settles correctly.
  const confirmed = useRef(new Map<string, { link: string | null; request: number }>());
  const pending = useRef(new Map<number, Map<string, string | null>>());
  const requestSeq = useRef(0);

  /** Settle a request (optionally adopting the server's links) and redraw every tracked link. */
  const settle = useCallback((request: number, serverLinks?: Habit[]) => {
    pending.current.delete(request);
    for (const habit of serverLinks ?? []) {
      // Ignore a response older than one already adopted for this habit.
      if ((confirmed.current.get(habit.id)?.request ?? 0) <= request) {
        confirmed.current.set(habit.id, { link: habit.stackNextId ?? null, request });
      }
    }
    const links = new Map([...confirmed.current].map(([id, { link }]) => [id, link] as const));
    for (const patch of pending.current.values()) {
      for (const [id, link] of patch) links.set(id, link);
    }
    if (pending.current.size === 0) confirmed.current.clear();
    setHabits((currentHabits) => withLinks(currentHabits, links));
  }, [setHabits]);

  /**
   * Apply an atomic stack mutation (insert, remove or reorder). Optimistically
   * patches `stackNextId` locally, then redraws links from confirmed + pending
   * state when it settles. Other habit fields (check-ins, archive state) are
   * never touched, so a late response cannot undo unrelated changes. Rejected
   * promises throw a thin error with the server-supplied message so callers
   * can surface a modal.
   */
  const applyStackMutation = useCallback(async (input: StackMutationInput) => {
    const logContext = {
      kind: input.kind,
      habitId: "habitId" in input ? input.habitId : undefined,
      count: input.kind === "reorder" ? input.habitIds.length : undefined,
    };
    const request = ++requestSeq.current;

    await optimistic({
      apply: () => {
        setHabits((currentHabits) => {
          const next = new Map<string, string | null>();
          for (const { id, patch } of patchesFor(input, currentHabits)) {
            const habit = currentHabits.find((h) => h.id === id);
            if (!habit || patch.stackNextId === undefined) continue;
            if (!confirmed.current.has(id)) {
              confirmed.current.set(id, { link: habit.stackNextId ?? null, request: 0 });
            }
            next.set(id, patch.stackNextId ?? null);
          }
          pending.current.set(request, next);
          return withLinks(currentHabits, next);
        });

        clientLogger.info("Applying habit stack mutation", {
          event: "store.habit.stack_mutation",
          ...logContext,
        });

        // `rethrow` below lets the caller show a modal after the rollback.
        return () => settle(request);
      },
      action: () => applyStackMutationAction(input),
      onSuccess: (updated) => settle(request, updated),
      failure: {
        log: "Habit stack mutation rolled back",
        event: "store.habit.stack_mutation_failed",
        context: logContext,
      },
      rethrow: true,
    });
  }, [setHabits, settle]);

  return useMemo(() => ({ applyStackMutation }), [applyStackMutation]);
}