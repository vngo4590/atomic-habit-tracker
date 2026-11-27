"use client";

/**
 * Habits slice of the client store: the habit list (with check-ins and
 * notes) and formation verdicts, plus their optimistic mutations. Composed
 * into the app-wide `StoreState` by `useStore` in `lib/store`.
 *
 * Every write goes through the shared `optimistic()` helper so rollback,
 * logging and toasts behave the same as in the other slices.
 */

import { type Dispatch, type SetStateAction, useCallback, useMemo, useRef, useState } from "react";

import { todayKey } from "@/lib/helpers";
import { clientLogger } from "@/lib/logger-client";
import { changedFields, optimistic, type ShowToast } from "@/lib/store/optimistic";
import type { FormationVerdict, Habit, HabitDraft, StoreSnapshot, StoreState } from "@/lib/types";

import { createHabitAction, deleteHabitAction, saveFormationVerdictAction, updateHabitAction } from "./actions";
import { MAX_ACTIVE_HABITS } from "./model/habit-cap";
import { normalizeDraft } from "./model/habit-draft";
import { useCheckInMutations } from "./store-check-ins";

export type HabitsSlice = Pick<
  StoreState,
  | "habits"
  | "toggleHabit"
  | "logCheckIn"
  | "addHabit"
  | "updateHabit"
  | "deleteHabit"
  | "formationVerdicts"
  | "saveFormationVerdict"
> & {
  /** Full React setter (accepts an updater) so the stacks slice can patch habits. */
  setHabits: Dispatch<SetStateAction<Habit[]>>;
};

export function useHabitsSlice(
  snapshot: Pick<StoreSnapshot, "habits" | "formationVerdicts">,
  showToast: ShowToast,
): HabitsSlice {
  const [habits, setHabits] = useState<Habit[]>(snapshot.habits);
  const [formationVerdicts, setFormationVerdicts] = useState<FormationVerdict[]>(snapshot.formationVerdicts);
  const updateHabitVersion = useRef(0);
  const { toggleHabit, logCheckIn } = useCheckInMutations(setHabits, showToast);

  const addHabit = useCallback((draft: HabitDraft) => {
    const tempId = `pending-${Date.now()}`;
    setHabits((currentHabits) => [
      ...currentHabits,
      {
        ...normalizeDraft(draft),
        id: tempId,
        history: {},
        notes: [],
        createdAt: todayKey(),
      },
    ]);

    clientLogger.info("Creating habit", {
      event: "store.habit.create",
      habitId: tempId,
      schedule: draft.schedule ?? "Daily",
      time: draft.time ?? "Morning",
      hasStackTarget: Boolean(draft.stackNextId),
      hasContract: Boolean(draft.contract?.trim()),
    });

    void optimistic({
      action: () => createHabitAction(draft),
      isRefused: (result) => !result.ok,
      onRefused: (result) => {
        if (result.ok) {
          return;
        }
        // The server refused the create (e.g. the active-habit cap was hit —
        // possibly a race across browser tabs). Roll back the optimistic add
        // by removing exactly the pending row we inserted, then explain why
        // via a Toast instead of silently swallowing the failure.
        clientLogger.warn("Habit creation refused", {
          event: "store.habit.create_refused",
          habitId: tempId,
          reason: result.reason,
        });
        setHabits((currentHabits) => currentHabits.filter((habit) => habit.id !== tempId));
        if (result.reason === "cap") {
          showToast(
            "Couldn't create habit",
            `You can have at most ${MAX_ACTIVE_HABITS} active habits. Induct one into the Hall of Fame to free a slot.`,
          );
        }
      },
      onSuccess: (result) => {
        if (!result.ok) {
          return;
        }
        setHabits((currentHabits) =>
          currentHabits.map((habit) => (habit.id === tempId ? result.habit : habit)),
        );
      },
      failure: {
        log: "Habit creation failed",
        event: "store.habit.create_failed",
        context: { habitId: tempId },
      },
    });
  }, [showToast]);

  const updateHabit = useCallback((id: string, patch: Partial<Habit>) => {
    const version = ++updateHabitVersion.current;
    let preSnapshot: Habit | null = null;

    void optimistic({
      apply: () => {
        setHabits((currentHabits) => {
          preSnapshot = currentHabits.find((habit) => habit.id === id) ?? null;
          return currentHabits.map((habit) => (habit.id === id ? { ...habit, ...patch } : habit));
        });

        clientLogger.info("Updating habit", {
          event: "store.habit.update",
          habitId: id,
          fields: changedFields(patch),
        });

        // Roll back the optimistic patch so the UI matches the server.
        return () => {
          if (version === updateHabitVersion.current && preSnapshot) {
            const snapshotHabit = preSnapshot;
            setHabits((currentHabits) =>
              currentHabits.map((habit) => (habit.id === id ? snapshotHabit : habit)),
            );
          }
        };
      },
      action: () => updateHabitAction(id, patch),
      onSuccess: (saved) => {
        if (!saved || version !== updateHabitVersion.current) {
          return;
        }
        setHabits((currentHabits) =>
          currentHabits.map((habit) => (habit.id === id ? { ...habit, ...saved, ...patch } : habit)),
        );
      },
      failure: {
        log: "Habit update rolled back",
        event: "store.habit.update_failed",
        context: { habitId: id, fields: changedFields(patch) },
        toast: "Couldn't update habit",
      },
      showToast,
    });
  }, [showToast]);

  const deleteHabit = useCallback((id: string) => {
    setHabits((currentHabits) => currentHabits.filter((habit) => habit.id !== id));
    clientLogger.info("Deleting habit", {
      event: "store.habit.delete",
      habitId: id,
    });
    void optimistic({
      action: () => Promise.resolve(deleteHabitAction(id)),
      failure: {
        log: "Habit deletion failed",
        event: "store.habit.delete_failed",
        context: { habitId: id },
      },
    });
  }, []);

  const saveFormationVerdict = useCallback((verdict: FormationVerdict) => {
    setFormationVerdicts((current) => [
      ...current.filter((item) => item.habitId !== verdict.habitId),
      verdict,
    ]);
    clientLogger.info("Saving formation verdict", {
      event: "store.formation.save",
      habitId: verdict.habitId,
      formed: verdict.formed,
      score: verdict.score,
    });
    void optimistic({
      action: () => saveFormationVerdictAction(verdict),
      onSuccess: (saved) => {
        if (!saved) {
          return;
        }
        setFormationVerdicts((current) => [
          ...current.filter((item) => item.habitId !== saved.habitId),
          saved,
        ]);
      },
      failure: {
        log: "Formation verdict save failed",
        event: "store.formation.save_failed",
        context: { habitId: verdict.habitId },
      },
    });
  }, []);

  return useMemo(
    () => ({
      habits,
      setHabits,
      toggleHabit,
      logCheckIn,
      addHabit,
      updateHabit,
      deleteHabit,
      formationVerdicts,
      saveFormationVerdict,
    }),
    [habits, toggleHabit, logCheckIn, addHabit, updateHabit, deleteHabit, formationVerdicts, saveFormationVerdict],
  );
}
