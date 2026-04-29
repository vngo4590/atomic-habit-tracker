"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { dateAdd, todayKey } from "@/lib/helpers";
import {
  SAMPLE_HABITS,
  SAMPLE_IDENTITY,
  SAMPLE_JOURNAL,
} from "@/lib/sample-data";
import type {
  CheckIn,
  Habit,
  HabitDraft,
  Identity,
  JournalEntry,
  StoreState,
  ToastState,
} from "@/lib/types";

const STORAGE_KEY = "atomicly:store";

interface PersistedStore {
  habits: Habit[];
  journal: JournalEntry[];
  identity: Identity;
}

function isCheckIn(value: Habit["history"][string]): value is CheckIn {
  return typeof value === "object" && value !== null;
}

function isDone(value: Habit["history"][string] | undefined) {
  return Boolean(value);
}

function normalizeDraft(draft: HabitDraft): Omit<Habit, "id" | "history" | "notes" | "createdAt"> {
  return {
    name: draft.name,
    emoji: draft.emoji ?? "•",
    cue: draft.cue ?? "",
    craving: draft.craving ?? "",
    response: draft.response ?? "",
    reward: draft.reward ?? "",
    twoMin: draft.twoMin ?? "",
    stack: draft.stack ?? "",
    identity: draft.identity,
    environment: draft.environment ?? "",
    schedule: draft.schedule ?? "Daily",
    time: draft.time ?? "Morning",
    contract: draft.contract ?? "",
    contractPartners: draft.contractPartners ?? [],
  };
}

export function streak(habit: Habit) {
  let count = 0;
  let date = todayKey();

  if (!isDone(habit.history[date])) {
    date = dateAdd(date, -1);
  }

  while (isDone(habit.history[date])) {
    count++;
    date = dateAdd(date, -1);
  }

  return count;
}

export function longestStreak(habit: Habit) {
  const keys = Object.keys(habit.history).filter((key) => isDone(habit.history[key])).sort();
  if (keys.length === 0) {
    return 0;
  }

  let best = 1;
  let current = 1;

  for (let i = 1; i < keys.length; i++) {
    if (dateAdd(keys[i - 1], 1) === keys[i]) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

export function completionRate(habit: Habit, days = 30) {
  let done = 0;

  for (let i = 0; i < days; i++) {
    if (isDone(habit.history[dateAdd(todayKey(), -i)])) {
      done++;
    }
  }

  return done / days;
}

export function useStore(): StoreState {
  const [habits, setHabits] = useState<Habit[]>(SAMPLE_HABITS);
  const [journal, setJournal] = useState<JournalEntry[]>(SAMPLE_JOURNAL);
  const [identity, setIdentityState] = useState<Identity>(SAMPLE_IDENTITY);
  const [toast, setToast] = useState<ToastState | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    window.queueMicrotask(() => {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<PersistedStore>;
          if (parsed.habits) {
            setHabits(parsed.habits);
          }
          if (parsed.journal) {
            setJournal(parsed.journal);
          }
          if (parsed.identity) {
            setIdentityState(parsed.identity);
          }
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      hydrated.current = true;
    });
  }, []);

  useEffect(() => {
    if (!hydrated.current) {
      return;
    }

    const payload: PersistedStore = { habits, journal, identity };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [habits, identity, journal]);

  const showToast = useCallback((msg: string, sub?: string) => {
    const id = Date.now();
    setToast({ msg, sub, id });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 2400);
  }, []);

  const toggleHabit = useCallback(
    (id: number, dateKey = todayKey(), payload: Partial<CheckIn> | null = null) => {
      let toastIdentity: string | null = null;
      let toastVotes = 0;

      setHabits((currentHabits) =>
        currentHabits.map((habit) => {
          if (habit.id !== id) {
            return habit;
          }

          const history = { ...habit.history };
          const previous = history[dateKey];

          if (previous && !payload) {
            delete history[dateKey];
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

      if (toastIdentity) {
        showToast(`Vote cast for "${toastIdentity}"`, `${toastVotes} total`);
      }
    },
    [showToast],
  );

  const logCheckIn = useCallback(
    (id: number, payload: Partial<CheckIn>, dateKey = todayKey()) => {
      setHabits((currentHabits) =>
        currentHabits.map((habit) => {
          if (habit.id !== id) {
            return habit;
          }

          const history = { ...habit.history };
          const previous = history[dateKey];
          const prevObject = isCheckIn(previous) ? previous : {};
          history[dateKey] = { done: true, ...prevObject, ...payload };

          return { ...habit, history };
        }),
      );
    },
    [],
  );

  const addHabit = useCallback((draft: HabitDraft) => {
    setHabits((currentHabits) => [
      ...currentHabits,
      {
        ...normalizeDraft(draft),
        id: Date.now(),
        history: {},
        notes: [],
        createdAt: todayKey(),
      },
    ]);
  }, []);

  const updateHabit = useCallback((id: number, patch: Partial<Habit>) => {
    setHabits((currentHabits) =>
      currentHabits.map((habit) => (habit.id === id ? { ...habit, ...patch } : habit)),
    );
  }, []);

  const deleteHabit = useCallback((id: number) => {
    setHabits((currentHabits) => currentHabits.filter((habit) => habit.id !== id));
  }, []);

  const addJournal = useCallback((entry: Partial<JournalEntry>) => {
    setJournal((currentJournal) => [
      {
        id: Date.now(),
        date: todayKey(),
        title: "",
        body: "",
        mood: "good",
        tags: [],
        ...entry,
      },
      ...currentJournal,
    ]);
  }, []);

  const setIdentity = useCallback((nextIdentity: Identity) => {
    setIdentityState(nextIdentity);
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
      journal,
      addJournal,
      identity,
      setIdentity,
      toast,
      showToast,
      streak,
      longestStreak,
      completionRate,
    }),
    [
      addHabit,
      addJournal,
      deleteHabit,
      habits,
      identity,
      journal,
      logCheckIn,
      setIdentity,
      showToast,
      toast,
      toggleHabit,
      updateHabit,
    ],
  );
}
