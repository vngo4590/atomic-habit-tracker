"use client";

/**
 * Habit check-in mutations for the client store: toggling a day done/undone
 * and logging check-in details (mood, journal). Both update the cached habit
 * immediately and reconcile with the server through the shared `optimistic()`
 * helper. Used by `useHabitsSlice` in `./store.ts`.
 */

import { type Dispatch, type SetStateAction, useCallback } from "react";

import { todayKey } from "@/lib/helpers";
import { clientLogger } from "@/lib/logger-client";
import { optimistic, type ShowToast } from "@/lib/store/optimistic";
import type { CheckIn, Habit } from "@/lib/types";

import { logCheckInAction, toggleHabitAction } from "./actions";
import { isDone } from "./model/metrics";

function isCheckIn(value: Habit["history"][string]): value is CheckIn {
  return typeof value === "object" && value !== null;
}

export function useCheckInMutations(setHabits: Dispatch<SetStateAction<Habit[]>>, showToast: ShowToast) {
  const toggleHabit = useCallback(
    (id: string, dateKey = todayKey(), payload: Partial<CheckIn> | null = null) => {
      let toastIdentity: string | null = null;
      let toastVotes = 0;
      let shouldComplete = true;
      let hadEntry = false;
      let previousEntry: Habit["history"][string] | undefined;

      setHabits((currentHabits) =>
        currentHabits.map((habit) => {
          if (habit.id !== id) {
            return habit;
          }

          const history = { ...habit.history };
          const previous = history[dateKey];
          hadEntry = Object.prototype.hasOwnProperty.call(habit.history, dateKey);
          previousEntry = previous;

          if (previous && !payload) {
            delete history[dateKey];
            shouldComplete = false;
          } else {
            const prevObject = isCheckIn(previous) ? previous : {};
            history[dateKey] = { done: true, ...prevObject, ...(payload ?? {}) };
            if (!previous) {
              toastIdentity = habit.identity;
              toastVotes = Object.keys(history).filter((key) => isDone(history[key])).length;
            }
          }

          return { ...habit, history };
        }),
      );

      clientLogger.info("Habit toggled", {
        event: "store.habit.toggle",
        habitId: id,
        dateKey,
        done: shouldComplete,
        includesCheckIn: Boolean(payload),
      });

      void optimistic({
        // The optimistic change was applied above (it also decides the toast).
        // Rolling back restores only this habit's entry for `dateKey`, so
        // unrelated edits made while the request was in flight survive.
        apply: () => () =>
          setHabits((currentHabits) =>
            currentHabits.map((habit) => {
              if (habit.id !== id) {
                return habit;
              }
              const history = { ...habit.history };
              if (hadEntry) {
                history[dateKey] = previousEntry as Habit["history"][string];
              } else {
                delete history[dateKey];
              }
              return { ...habit, history };
            }),
          ),
        action: () => toggleHabitAction(id, dateKey, shouldComplete),
        onSuccess: (saved) => {
          if (!saved) {
            return;
          }
          setHabits((currentHabits) => currentHabits.map((habit) => (habit.id === id ? saved : habit)));
        },
        failure: {
          log: "Habit toggle failed",
          event: "store.habit.toggle_failed",
          context: { habitId: id, dateKey, done: shouldComplete },
          toast: "Couldn't save check-in",
        },
        showToast,
      });

      if (toastIdentity) {
        showToast(`Vote cast for "${toastIdentity}"`, `${toastVotes} total`);
      }
    },
    [setHabits, showToast],
  );

  const logCheckIn = useCallback(
    (id: string, payload: Partial<CheckIn>, dateKey = todayKey()) => {
      setHabits((currentHabits) =>
        currentHabits.map((habit) => {
          if (habit.id !== id) {
            return habit;
          }

          const history = { ...habit.history };
          const previous = history[dateKey];
          const prevObject = isCheckIn(previous) ? previous : {};
          history[dateKey] = { done: true, ...prevObject, ...payload };
          if (Object.prototype.hasOwnProperty.call(payload, "mood") && payload.mood === undefined) {
            delete (history[dateKey] as CheckIn).mood;
          }
          if (Object.prototype.hasOwnProperty.call(payload, "journal") && payload.journal === undefined) {
            delete (history[dateKey] as CheckIn).journal;
          }

          return { ...habit, history };
        }),
      );

      clientLogger.info("Habit check-in saved", {
        event: "store.check-in.save",
        habitId: id,
        dateKey,
        hasMood: payload.mood !== undefined,
        hasJournal: payload.journal !== undefined,
      });

      void optimistic({
        action: () => logCheckInAction(id, dateKey, payload),
        onSuccess: (saved) => {
          if (!saved) {
            return;
          }
          setHabits((currentHabits) => currentHabits.map((habit) => (habit.id === id ? saved : habit)));
        },
        failure: {
          log: "Habit check-in failed",
          event: "store.check-in.save_failed",
          context: { habitId: id, dateKey },
        },
      });
    },
    [setHabits],
  );

  return { toggleHabit, logCheckIn };
}
