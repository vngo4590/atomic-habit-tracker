"use client";

import { useCallback, useMemo, useState } from "react";

import {
  createHabitAction,
  createJournalEntryAction,
  deleteHabitAction,
  logCheckInAction,
  markLessonReadAction,
  saveFormationVerdictAction,
  saveIdentityAction,
  savePreferencesAction,
  saveWeeklyReviewAction,
  toggleHabitAction,
  updateHabitAction,
} from "@/lib/actions/domain";
import { dateAdd, todayKey } from "@/lib/helpers";
import type {
  CheckIn,
  FormationVerdict,
  Habit,
  HabitDraft,
  Identity,
  JournalEntry,
  StoreSnapshot,
  StoreState,
  ToastState,
  UserPreferences,
  WeeklyReviewAnswers,
} from "@/lib/types";

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

export const defaultSnapshot: StoreSnapshot = {
  habits: [],
  journal: [],
  identity: {
    statement: "",
    values: [],
  },
  weeklyReview: {
    wentWell: "",
    smallestFix: "",
    identityVote: "",
  },
  completedLessons: [],
  formationVerdicts: [],
  preferences: {
    theme: "light",
    accentHue: 60,
    remindersEnabled: true,
    weeklyReviewNudge: true,
    accountabilityNudge: false,
    onboardingSeen: false,
    lessonMode: "sequential",
    timezone: "UTC",
  },
};

export function useStore(initialSnapshot: StoreSnapshot = defaultSnapshot): StoreState {
  const [habits, setHabits] = useState<Habit[]>(initialSnapshot.habits);
  const [journal, setJournal] = useState<JournalEntry[]>(initialSnapshot.journal);
  const [identity, setIdentityState] = useState<Identity>(initialSnapshot.identity);
  const [weeklyReview, setWeeklyReviewState] = useState<WeeklyReviewAnswers>(initialSnapshot.weeklyReview);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(
    () => new Set(initialSnapshot.completedLessons),
  );
  const [lessonModeState, setLessonModeState] = useState(initialSnapshot.preferences.lessonMode);
  const [formationVerdicts, setFormationVerdicts] = useState<FormationVerdict[]>(
    initialSnapshot.formationVerdicts,
  );
  const [preferences, setPreferencesState] = useState<UserPreferences>(initialSnapshot.preferences);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((msg: string, sub?: string) => {
    const id = Date.now();
    setToast({ msg, sub, id });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 2400);
  }, []);

  const toggleHabit = useCallback(
    (id: string, dateKey = todayKey(), payload: Partial<CheckIn> | null = null) => {
      let toastIdentity: string | null = null;
      let toastVotes = 0;
      let shouldComplete = true;

      setHabits((currentHabits) =>
        currentHabits.map((habit) => {
          if (habit.id !== id) {
            return habit;
          }

          const history = { ...habit.history };
          const previous = history[dateKey];

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

      void toggleHabitAction(id, dateKey, shouldComplete).then((saved) => {
        if (!saved) {
          return;
        }
        setHabits((currentHabits) => currentHabits.map((habit) => (habit.id === id ? saved : habit)));
      });

      if (toastIdentity) {
        showToast(`Vote cast for "${toastIdentity}"`, `${toastVotes} total`);
      }
    },
    [showToast],
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

      void logCheckInAction(id, dateKey, payload).then((saved) => {
        if (!saved) {
          return;
        }
        setHabits((currentHabits) => currentHabits.map((habit) => (habit.id === id ? saved : habit)));
      });
    },
    [],
  );

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

    void createHabitAction(draft).then((saved) => {
      setHabits((currentHabits) =>
        currentHabits.map((habit) => (habit.id === tempId ? saved : habit)),
      );
    });
  }, []);

  const updateHabit = useCallback((id: string, patch: Partial<Habit>) => {
    setHabits((currentHabits) =>
      currentHabits.map((habit) => (habit.id === id ? { ...habit, ...patch } : habit)),
    );
    void updateHabitAction(id, patch).then((saved) => {
      if (!saved) {
        return;
      }
      setHabits((currentHabits) => currentHabits.map((habit) => (habit.id === id ? saved : habit)));
    });
  }, []);

  const deleteHabit = useCallback((id: string) => {
    setHabits((currentHabits) => currentHabits.filter((habit) => habit.id !== id));
    void deleteHabitAction(id);
  }, []);

  const addJournal = useCallback((entry: Partial<JournalEntry>) => {
    const tempId = `pending-${Date.now()}`;
    setJournal((currentJournal) => [
      {
        id: tempId,
        date: todayKey(),
        title: "",
        body: "",
        mood: "good",
        tags: [],
        ...entry,
      },
      ...currentJournal,
    ]);

    void createJournalEntryAction(entry).then((saved) => {
      setJournal((currentJournal) =>
        currentJournal.map((journalEntry) => (journalEntry.id === tempId ? saved : journalEntry)),
      );
    });
  }, []);

  const setIdentity = useCallback((nextIdentity: Identity) => {
    setIdentityState(nextIdentity);
    void saveIdentityAction(nextIdentity).then(setIdentityState);
  }, []);

  const setWeeklyReview = useCallback((weekStartKey: string, answers: WeeklyReviewAnswers) => {
    setWeeklyReviewState(answers);
    void saveWeeklyReviewAction(weekStartKey, answers).then(setWeeklyReviewState);
  }, []);

  const setLessonMode = useCallback((lessonMode: UserPreferences["lessonMode"]) => {
    setLessonModeState(lessonMode);
    setPreferencesState((current) => ({ ...current, lessonMode }));
    void savePreferencesAction({ lessonMode }).then((saved) => {
      setPreferencesState(saved);
      setLessonModeState(saved.lessonMode);
    });
  }, []);

  const markLessonRead = useCallback((lessonId: number) => {
    setCompletedLessons((current) => new Set([...current, lessonId]));
    void markLessonReadAction(lessonId).then((completed) => setCompletedLessons(new Set(completed)));
  }, []);

  const saveFormationVerdict = useCallback((verdict: FormationVerdict) => {
    setFormationVerdicts((current) => [
      ...current.filter((item) => item.habitId !== verdict.habitId),
      verdict,
    ]);
    void saveFormationVerdictAction(verdict).then((saved) => {
      if (!saved) {
        return;
      }
      setFormationVerdicts((current) => [
        ...current.filter((item) => item.habitId !== saved.habitId),
        saved,
      ]);
    });
  }, []);

  const setPreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferencesState((current) => ({ ...current, ...patch }));
    if (patch.lessonMode) {
      setLessonModeState(patch.lessonMode);
    }
    void savePreferencesAction(patch).then((saved) => {
      setPreferencesState(saved);
      setLessonModeState(saved.lessonMode);
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
      journal,
      addJournal,
      identity,
      setIdentity,
      weeklyReview,
      setWeeklyReview,
      completedLessons,
      lessonMode: lessonModeState,
      setLessonMode,
      markLessonRead,
      formationVerdicts,
      saveFormationVerdict,
      preferences,
      setPreferences,
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
      weeklyReview,
      completedLessons,
      lessonModeState,
      formationVerdicts,
      preferences,
      logCheckIn,
      markLessonRead,
      saveFormationVerdict,
      setLessonMode,
      setPreferences,
      setIdentity,
      setWeeklyReview,
      showToast,
      toast,
      toggleHabit,
      updateHabit,
    ],
  );
}
