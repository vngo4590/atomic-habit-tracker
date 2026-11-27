"use client";

/**
 * Habit check-in mutations for the client store: toggling a day done/undone
 * and logging check-in details (mood, journal). Both update the cached habit
 * immediately and reconcile with the server through the shared `optimistic()`
 * helper. Used by `useHabitsSlice` in `./store.ts`.
 */

import { type Dispatch, type SetStateAction, useCallback, useRef } from "react";
import { flushSync } from "react-dom";

import { todayKey } from "@/lib/helpers";
import { clientLogger } from "@/lib/logger-client";
import { optimistic, type ShowToast } from "@/lib/store/optimistic";
import type { CheckIn, Habit } from "@/lib/types";

import { logCheckInAction, toggleHabitAction } from "./actions";
import { isDone } from "./model/metrics";

function isCheckIn(value: Habit["history"][string]): value is CheckIn {
  return typeof value === "object" && value !== null;
}

/** Put back one habit's entry for one day, leaving everything else as it is now. */
function restoreEntry(
  habits: Habit[],
  id: string,
  dateKey: string,
  hadEntry: boolean,
  previousEntry: Habit["history"][string] | undefined,
) {
  return habits.map((habit) => {
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
  });
}

export function useCheckInMutations(
  setHabits: Dispatch<SetStateAction<Habit[]>>,
  showToast: ShowToast,
) {
  // Which request "owns" each habit/day. A toggle or check-in that finishes
  // after a newer one for the same habit/day must not roll back or overwrite
  // the newer state, so both mutations claim ownership and check it.
  const owners = useRef(new Map<string, number>());
  const nextToken = useRef(0);
  const claim = useCallback((id: string, dateKey: string) => {
    const key = `${id}|${dateKey}`;
    const token = ++nextToken.current;
    owners.current.set(key, token);
    return {
      owns: () => owners.current.get(key) === token,
      release: () => {
        if (owners.current.get(key) === token) {
          owners.current.delete(key);
        }
      },
    };
  }, []);

  const toggleHabit = useCallback(
    (
      id: string,
      dateKey = todayKey(),
      payload: Partial<CheckIn> | null = null,
    ) => {
      let toastIdentity: string | null = null;
      let toastVotes = 0;
      let shouldComplete = true;
      let hadEntry = false;
      let previousEntry: Habit["history"][string] | undefined;

      // flushSync runs the updater now, so `shouldComplete` and the toast are
      // derived from the latest state before the server call below (React may
      // otherwise defer it, e.g. on a rapid second click).
      flushSync(() =>
        setHabits((currentHabits) =>
          currentHabits.map((habit) => {
            if (habit.id !== id) {
              return habit;
            }

            const history = { ...habit.history };
            const previous = history[dateKey];
            hadEntry = Object.prototype.hasOwnProperty.call(
              habit.history,
              dateKey,
            );
            previousEntry = previous;

            // A stored `{ done: false }` entry (mood/journal kept after an undo)
            // is not done: checking it completes the day and keeps its fields.
            const wasDone = isDone(previous);
            const prevObject = isCheckIn(previous) ? previous : {};
            if (wasDone && !payload) {
              shouldComplete = false;
              const retained: Partial<CheckIn> = { ...prevObject };
              delete retained.done;
              if (Object.keys(retained).length)
                history[dateKey] = { ...retained, done: false };
              else delete history[dateKey];
            } else {
              history[dateKey] = {
                ...prevObject,
                done: true,
                ...(payload ?? {}),
              };
              if (!wasDone) {
                toastIdentity = habit.identity;
                toastVotes = Object.keys(history).filter((key) =>
                  isDone(history[key]),
                ).length;
              }
            }

            return { ...habit, history };
          }),
        ),
      );

      clientLogger.info("Habit toggled", {
        event: "store.habit.toggle",
        habitId: id,
        dateKey,
        done: shouldComplete,
        includesCheckIn: Boolean(payload),
      });

      const ownership = claim(id, dateKey);
      void optimistic({
        // The optimistic change was applied above (it also decides the toast).
        // Rolling back restores only this habit's entry for `dateKey`, and
        // only while no newer toggle/check-in for that day has taken over.
        apply: () => () => {
          if (ownership.owns()) {
            setHabits((currentHabits) =>
              restoreEntry(currentHabits, id, dateKey, hadEntry, previousEntry),
            );
          }
          ownership.release();
        },
        action: () => toggleHabitAction(id, dateKey, shouldComplete),
        onSuccess: (saved) => {
          if (saved && ownership.owns()) {
            setHabits((currentHabits) =>
              currentHabits.map((habit) => (habit.id === id ? saved : habit)),
            );
          }
          ownership.release();
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
    [setHabits, showToast, claim],
  );

  const logCheckIn = useCallback(
    (id: string, payload: Partial<CheckIn>, dateKey = todayKey()) => {
      let hadEntry = false;
      let previousEntry: Habit["history"][string] | undefined;

      setHabits((currentHabits) =>
        currentHabits.map((habit) => {
          if (habit.id !== id) {
            return habit;
          }

          const history = { ...habit.history };
          const previous = history[dateKey];
          hadEntry = Object.prototype.hasOwnProperty.call(
            habit.history,
            dateKey,
          );
          previousEntry = previous;
          const prevObject = isCheckIn(previous) ? previous : {};
          history[dateKey] = { ...prevObject, done: true, ...payload };
          if (
            Object.prototype.hasOwnProperty.call(payload, "mood") &&
            payload.mood === undefined
          ) {
            delete (history[dateKey] as CheckIn).mood;
          }
          if (
            Object.prototype.hasOwnProperty.call(payload, "journal") &&
            payload.journal === undefined
          ) {
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

      const ownership = claim(id, dateKey);
      void optimistic({
        apply: () => () => {
          if (ownership.owns()) {
            setHabits((currentHabits) =>
              restoreEntry(currentHabits, id, dateKey, hadEntry, previousEntry),
            );
          }
          ownership.release();
        },
        action: () => logCheckInAction(id, dateKey, payload),
        onSuccess: (saved) => {
          if (saved && ownership.owns()) {
            setHabits((currentHabits) =>
              currentHabits.map((habit) => (habit.id === id ? saved : habit)),
            );
          }
          ownership.release();
        },
        failure: {
          log: "Habit check-in failed",
          event: "store.check-in.save_failed",
          context: { habitId: id, dateKey },
          toast: "Couldn't save check-in details",
        },
        showToast,
      });
    },
    [setHabits, showToast, claim],
  );

  return { toggleHabit, logCheckIn };
}
