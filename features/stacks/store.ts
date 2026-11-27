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
  // Which request last touched each habit's link, so a slow response never
  // overwrites a newer stack mutation of the same habit.
  const linkOwner = useRef(new Map<string, number>());
  const requestSeq = useRef(0);

  /**
   * Apply an atomic stack mutation (insert, remove or reorder). Optimistically
   * patches `stackNextId` locally, then reconciles only the links this request
   * still owns. Other habit fields (check-ins, archive state) are never touched,
   * so a late response cannot undo unrelated changes. Rejected promises throw a
   * thin error with the server-supplied message so callers can surface a modal.
   */
  const applyStackMutation = useCallback(async (input: StackMutationInput) => {
    const logContext = {
      kind: input.kind,
      habitId: "habitId" in input ? input.habitId : undefined,
      count: input.kind === "reorder" ? input.habitIds.length : undefined,
    };
    const request = ++requestSeq.current;
    const owned = (id: string) => linkOwner.current.get(id) === request;

    await optimistic({
      apply: () => {
        const previous = new Map<string, string | null>();
        setHabits((currentHabits) => {
          const next = new Map<string, string | null>();
          for (const { id, patch } of patchesFor(input, currentHabits)) {
            const habit = currentHabits.find((h) => h.id === id);
            if (!habit || patch.stackNextId === undefined) continue;
            previous.set(id, habit.stackNextId ?? null);
            next.set(id, patch.stackNextId ?? null);
            linkOwner.current.set(id, request);
          }
          return withLinks(currentHabits, next);
        });

        clientLogger.info("Applying habit stack mutation", {
          event: "store.habit.stack_mutation",
          ...logContext,
        });

        // Restore only the links this request still owns; `rethrow` below lets the caller show a modal.
        return () =>
          setHabits((currentHabits) =>
            withLinks(currentHabits, new Map([...previous].filter(([id]) => owned(id)))),
          );
      },
      action: () => applyStackMutationAction(input),
      onSuccess: (updated) => {
        // Adopt the server's links, but only for links no newer request has taken over.
        const confirmed = new Map(
          updated
            .filter((h) => !linkOwner.current.has(h.id) || owned(h.id))
            .map((h) => [h.id, h.stackNextId ?? null] as const),
        );
        setHabits((currentHabits) => withLinks(currentHabits, confirmed));
      },
      failure: {
        log: "Habit stack mutation rolled back",
        event: "store.habit.stack_mutation_failed",
        context: logContext,
      },
      rethrow: true,
    });
  }, [setHabits]);

  return useMemo(() => ({ applyStackMutation }), [applyStackMutation]);
}