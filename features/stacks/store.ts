"use client";

/**
 * Stacks slice of the client store. Stacks have no state of their own — a
 * stack is the `stackNextId` linked list on habits — so this slice patches
 * the habits slice's list through its `setHabits` setter.
 */

import { type Dispatch, type SetStateAction, useCallback, useMemo } from "react";

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

export function useStacksSlice(setHabits: Dispatch<SetStateAction<Habit[]>>): StacksSlice {
  /**
   * Apply an atomic stack mutation (insert or remove). Optimistically applies
   * the patches locally and reconciles with the server response, or rolls
   * back to the pre-mutation snapshot on failure. Rejected promises throw a
   * thin error with the server-supplied message so callers can surface a
   * modal dialog.
   */
  const applyStackMutation = useCallback(async (input: StackMutationInput) => {
    const logContext = {
      kind: input.kind,
      habitId: "habitId" in input ? input.habitId : undefined,
      count: input.kind === "reorder" ? input.habitIds.length : undefined,
    };

    await optimistic({
      apply: () => {
        let snapshot: Habit[] = [];
        setHabits((currentHabits) => {
          snapshot = currentHabits;
          const map = new Map(currentHabits.map((h) => [h.id, { ...h }]));
          const list = Array.from(map.values());

          if (input.kind === "insert") {
            const patches = stackInsertPatchesHelper(input.habitId, input.position, input.targetId, list);
            for (const { id, patch } of patches) {
              const record = map.get(id);
              if (record && patch.stackNextId !== undefined) {
                record.stackNextId = patch.stackNextId ?? null;
              }
            }
          } else if (input.kind === "remove") {
            const patches = stackRemovePatchesHelper(input.habitId, list);
            for (const { id, patch } of patches) {
              const record = map.get(id);
              if (record && patch.stackNextId !== undefined) {
                record.stackNextId = patch.stackNextId ?? null;
              }
            }
          } else {
            // kind === "reorder"
            const patches = stackReorderPatchesHelper(input.habitIds);
            for (const { id, patch } of patches) {
              const record = map.get(id);
              if (record && patch.stackNextId !== undefined) {
                record.stackNextId = patch.stackNextId ?? null;
              }
            }
          }
          return Array.from(map.values());
        });

        clientLogger.info("Applying habit stack mutation", {
          event: "store.habit.stack_mutation",
          ...logContext,
        });

        // Roll back optimistic state; `rethrow` below lets the caller show a modal.
        return () => setHabits(snapshot);
      },
      action: () => applyStackMutationAction(input),
      onSuccess: (updated) => {
        setHabits((currentHabits) => {
          const byId = new Map(currentHabits.map((h) => [h.id, h] as const));
          for (const habit of updated) {
            byId.set(habit.id, habit);
          }
          return Array.from(byId.values());
        });
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
