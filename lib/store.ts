"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  updateJournalEntryAction,
} from "@/lib/actions/domain";
import { dateAdd, todayKey } from "@/lib/helpers";
import { isScheduledForDate } from "@/lib/schedule";
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
  WeeklyReview,
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
    loopCue: draft.loopCue ?? draft.cue ?? "",
    loopCraving: draft.loopCraving ?? draft.craving ?? "",
    loopResponse: draft.loopResponse ?? draft.response ?? "",
    loopReward: draft.loopReward ?? draft.reward ?? "",
    twoMin: draft.twoMin ?? "",
    identity: draft.identity,
    environment: draft.environment ?? "",
    schedule: draft.schedule ?? "Daily",
    time: draft.time ?? "Morning",
    stackAfterId: draft.stackAfterId ?? null,
    contract: draft.contract ?? "",
    contractPartners: draft.contractPartners ?? [],
  };
}

/**
 * Current active streak — counts consecutive completed days walking backward
 * from today. Missing an unscheduled day does not break the streak, but
 * missing a scheduled day does. This preserves the old "anchor to yesterday"
 * behavior for daily habits while respecting custom schedules.
 */
export function streak(habit: Habit) {
  let count = 0;
  let date = todayKey();
  let seenAnchor = false;

  for (let i = 0; i < 365; i++) {
    const done = isDone(habit.history[date]);
    const scheduled = isScheduledForDate(date, habit.schedule);

    if (done) {
      count++;
      seenAnchor = true;
    } else if (scheduled) {
      if (seenAnchor) break;
      // Today (or the first day we hit) is scheduled and missed — step back
      // once, matching the old "anchor to yesterday" behavior, then continue.
      seenAnchor = true;
    } else {
      // Unscheduled day — neither helps nor hurts the streak
    }

    date = dateAdd(date, -1);
  }

  return count;
}

/**
 * Best streak ever — looks at consecutive done dates. If the gap between two
 * done dates consists only of unscheduled days, the streak continues across
 * the gap. A scheduled missed day breaks the streak.
 */
export function longestStreak(habit: Habit) {
  const keys = Object.keys(habit.history).filter((key) => isDone(habit.history[key])).sort();
  if (keys.length === 0) {
    return 0;
  }

  let best = 1;
  let current = 1;

  for (let i = 1; i < keys.length; i++) {
    const prev = keys[i - 1];
    const curr = keys[i];

    // Determine whether every calendar day between the two done dates is
    // unscheduled. If so, the streak continues; otherwise it resets.
    let gapIsAllUnscheduled = true;
    for (let date = dateAdd(prev, 1); date < curr; date = dateAdd(date, 1)) {
      if (isScheduledForDate(date, habit.schedule)) {
        gapIsAllUnscheduled = false;
        break;
      }
    }

    if (gapIsAllUnscheduled) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

/**
 * Adherence rate over the last N days. For habits with a structured schedule
 * (e.g. Mon, Wed) the denominator is the number of scheduled days in the
 * window, not the total number of calendar days. Bonus completions on
 * unscheduled days can push the result above 1.0.
 */
export function completionRate(habit: Habit, days = 30) {
  let done = 0;
  let scheduled = 0;

  for (let i = 0; i < days; i++) {
    const date = dateAdd(todayKey(), -i);
    if (isDone(habit.history[date])) {
      done++;
    }
    if (isScheduledForDate(date, habit.schedule)) {
      scheduled++;
    }
  }

  if (scheduled === 0) {
    // Free-text schedules are treated as always scheduled — fall back to
    // the original calendar-day denominator so we never divide by zero.
    return done / days;
  }

  return done / scheduled;
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
  weeklyReviews: [],
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

export function useStore(backendSnapshot: StoreSnapshot = defaultSnapshot): StoreState {
  const [habits, setHabits] = useState<Habit[]>(backendSnapshot.habits);
  const [journal, setJournal] = useState<JournalEntry[]>(backendSnapshot.journal);
  const [identity, setIdentityState] = useState<Identity>(backendSnapshot.identity);
  const [weeklyReview, setWeeklyReviewState] = useState<WeeklyReviewAnswers>(backendSnapshot.weeklyReview);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>(backendSnapshot.weeklyReviews ?? []);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(
    () => new Set(backendSnapshot.completedLessons),
  );
  const [lessonModeState, setLessonModeState] = useState(backendSnapshot.preferences.lessonMode);
  const [formationVerdicts, setFormationVerdicts] = useState<FormationVerdict[]>(
    backendSnapshot.formationVerdicts,
  );
  const [preferences, setPreferencesState] = useState<UserPreferences>(backendSnapshot.preferences);
  const [toast, setToast] = useState<ToastState | null>(null);
  const updateHabitVersion = useRef(0);
  const updateJournalVersion = useRef(0);
  const pendingJournalPatches = useRef(new Map<string, Partial<JournalEntry>>());
  const identityVersion = useRef(0);

  // Sync local state when the server sends a fresh snapshot (e.g. after
  // revalidatePath invalidates the layout cache and the user navigates back).
  // We bump version counters so any in-flight server responses that were
  // initiated before the snapshot are ignored — the snapshot already has the
  // latest data from the database.
  // Track the last synced snapshot data so we only update state when the
  // server actually sends different data. This avoids infinite loops in tests
  // where renderHook creates a new snapshot object on every render.
  const lastHabitsJson = useRef(JSON.stringify(backendSnapshot.habits));
  const lastJournalJson = useRef(JSON.stringify(backendSnapshot.journal));
  const lastIdentityJson = useRef(JSON.stringify(backendSnapshot.identity));
  const lastWeeklyReviewJson = useRef(JSON.stringify(backendSnapshot.weeklyReview));
  const lastWeeklyReviewsJson = useRef(JSON.stringify(backendSnapshot.weeklyReviews ?? []));
  const lastCompletedJson = useRef(JSON.stringify([...backendSnapshot.completedLessons].sort()));
  const lastLessonMode = useRef(backendSnapshot.preferences.lessonMode);
  const lastFormationJson = useRef(JSON.stringify(backendSnapshot.formationVerdicts));
  const lastPreferencesJson = useRef(JSON.stringify(backendSnapshot.preferences));

  useEffect(() => {
    const habitsJson = JSON.stringify(backendSnapshot.habits);
    if (lastHabitsJson.current !== habitsJson) {
      lastHabitsJson.current = habitsJson;
      setHabits(backendSnapshot.habits);
    }

    const journalJson = JSON.stringify(backendSnapshot.journal);
    if (lastJournalJson.current !== journalJson) {
      lastJournalJson.current = journalJson;
      setJournal(backendSnapshot.journal);
    }

    const identityJson = JSON.stringify(backendSnapshot.identity);
    if (lastIdentityJson.current !== identityJson) {
      lastIdentityJson.current = identityJson;
      setIdentityState(backendSnapshot.identity);
    }

    const weeklyReviewJson = JSON.stringify(backendSnapshot.weeklyReview);
    if (lastWeeklyReviewJson.current !== weeklyReviewJson) {
      lastWeeklyReviewJson.current = weeklyReviewJson;
      setWeeklyReviewState(backendSnapshot.weeklyReview);
    }

    const weeklyReviewsJson = JSON.stringify(backendSnapshot.weeklyReviews ?? []);
    if (lastWeeklyReviewsJson.current !== weeklyReviewsJson) {
      lastWeeklyReviewsJson.current = weeklyReviewsJson;
      setWeeklyReviews(backendSnapshot.weeklyReviews ?? []);
    }

    const completedJson = JSON.stringify([...backendSnapshot.completedLessons].sort());
    if (lastCompletedJson.current !== completedJson) {
      lastCompletedJson.current = completedJson;
      setCompletedLessons(new Set(backendSnapshot.completedLessons));
    }

    if (lastLessonMode.current !== backendSnapshot.preferences.lessonMode) {
      lastLessonMode.current = backendSnapshot.preferences.lessonMode;
      setLessonModeState(backendSnapshot.preferences.lessonMode);
    }

    const formationJson = JSON.stringify(backendSnapshot.formationVerdicts);
    if (lastFormationJson.current !== formationJson) {
      lastFormationJson.current = formationJson;
      setFormationVerdicts(backendSnapshot.formationVerdicts);
    }

    const preferencesJson = JSON.stringify(backendSnapshot.preferences);
    if (lastPreferencesJson.current !== preferencesJson) {
      lastPreferencesJson.current = preferencesJson;
      setPreferencesState(backendSnapshot.preferences);
    }

    updateHabitVersion.current++;
    updateJournalVersion.current++;
    identityVersion.current++;
  }, [backendSnapshot]);

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
    const version = ++updateHabitVersion.current;
    setHabits((currentHabits) =>
      currentHabits.map((habit) => (habit.id === id ? { ...habit, ...patch } : habit)),
    );
    void updateHabitAction(id, patch).then((saved) => {
      if (!saved || version !== updateHabitVersion.current) {
        return;
      }
      setHabits((currentHabits) =>
        currentHabits.map((habit) => (habit.id === id ? { ...habit, ...saved, ...patch } : habit)),
      );
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
        currentJournal.map((journalEntry) => {
          if (journalEntry.id !== tempId) {
            return journalEntry;
          }

          const pendingPatch = pendingJournalPatches.current.get(tempId) ?? {};
          pendingJournalPatches.current.delete(tempId);
          const merged = { ...saved, ...journalEntry, ...pendingPatch, id: saved.id };
          if (
            merged.title !== saved.title ||
            merged.body !== saved.body ||
            merged.mood !== saved.mood ||
            merged.date !== saved.date ||
            merged.tags.join("\u0000") !== saved.tags.join("\u0000")
          ) {
            void updateJournalEntryAction(saved.id, {
              date: merged.date,
              title: merged.title,
              body: merged.body,
              mood: merged.mood,
              tags: merged.tags,
            });
          }
          return merged;
        }),
      );
    });
  }, []);

  const updateJournal = useCallback((id: string, patch: Partial<JournalEntry>) => {
    const version = ++updateJournalVersion.current;
    if (id.startsWith("pending-")) {
      pendingJournalPatches.current.set(id, {
        ...(pendingJournalPatches.current.get(id) ?? {}),
        ...patch,
      });
    }
    setJournal((currentJournal) =>
      currentJournal.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );

    void updateJournalEntryAction(id, patch).then((saved) => {
      if (!saved || version !== updateJournalVersion.current) {
        return;
      }
      setJournal((currentJournal) =>
        currentJournal.map((entry) => (entry.id === id ? { ...entry, ...saved, ...patch } : entry)),
      );
    });
  }, []);

  const setIdentity = useCallback((nextIdentity: Identity) => {
    const version = ++identityVersion.current;
    setIdentityState(nextIdentity);
    void saveIdentityAction(nextIdentity).then((saved) => {
      if (version !== identityVersion.current) {
        return;
      }
      setIdentityState((current) => ({ ...current, ...saved, statement: nextIdentity.statement }));
    });
  }, []);

  const setWeeklyReview = useCallback((weekStartKey: string, answers: WeeklyReviewAnswers) => {
    setWeeklyReviewState(answers);
    const optimisticReview: WeeklyReview = {
      weekStartKey,
      ...answers,
      updatedAt: new Date().toISOString(),
    };
    setWeeklyReviews((current) => [
      optimisticReview,
      ...current.filter((review) => review.weekStartKey !== weekStartKey),
    ].sort((a, b) => b.weekStartKey.localeCompare(a.weekStartKey)));
    void saveWeeklyReviewAction(weekStartKey, answers).then((saved) => {
      setWeeklyReviewState(saved);
      setWeeklyReviews((current) => [
        saved,
        ...current.filter((review) => review.weekStartKey !== saved.weekStartKey),
      ].sort((a, b) => b.weekStartKey.localeCompare(a.weekStartKey)));
    });
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
      updateJournal,
      identity,
      setIdentity,
      weeklyReview,
      weeklyReviews,
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
      weeklyReviews,
      updateJournal,
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
