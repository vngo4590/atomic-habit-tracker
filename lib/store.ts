"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  applyStackMutationAction,
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
import type { StackMutationInput } from "@/lib/contracts/domain";
import { dateAdd, todayKey } from "@/lib/helpers";
import { clientLogger } from "@/lib/logger-client";
import { isScheduledForDate } from "@/lib/schedule";
import {
  stackInsertPatches as stackInsertPatchesHelper,
  stackRemovePatches as stackRemovePatchesHelper,
  stackReorderPatches as stackReorderPatchesHelper,
} from "@/lib/stack";
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
    stackNextId: draft.stackNextId ?? null,
    contract: draft.contract ?? "",
    contractPartners: draft.contractPartners ?? [],
  };
}

/** Reduce repeated unknown-error handling to a safe, non-sensitive message. */
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
}

/** Report which allowlisted fields are changing without logging their values. */
function changedFields(patch: object) {
  return Object.keys(patch).sort();
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

      clientLogger.info("Habit toggled", {
        event: "store.habit.toggle",
        habitId: id,
        dateKey,
        done: shouldComplete,
        includesCheckIn: Boolean(payload),
      });

      void toggleHabitAction(id, dateKey, shouldComplete)
        .then((saved) => {
          if (!saved) {
            return;
          }
          setHabits((currentHabits) => currentHabits.map((habit) => (habit.id === id ? saved : habit)));
        })
        .catch((error: unknown) => {
          clientLogger.warn("Habit toggle failed", {
            event: "store.habit.toggle_failed",
            habitId: id,
            dateKey,
            done: shouldComplete,
            message: errorMessage(error),
          });
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

      clientLogger.info("Habit check-in saved", {
        event: "store.check-in.save",
        habitId: id,
        dateKey,
        hasMood: payload.mood !== undefined,
        hasJournal: payload.journal !== undefined,
      });

      void logCheckInAction(id, dateKey, payload)
        .then((saved) => {
          if (!saved) {
            return;
          }
          setHabits((currentHabits) => currentHabits.map((habit) => (habit.id === id ? saved : habit)));
        })
        .catch((error: unknown) => {
          clientLogger.warn("Habit check-in failed", {
            event: "store.check-in.save_failed",
            habitId: id,
            dateKey,
            message: errorMessage(error),
          });
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

    clientLogger.info("Creating habit", {
      event: "store.habit.create",
      habitId: tempId,
      schedule: draft.schedule ?? "Daily",
      time: draft.time ?? "Morning",
      hasStackTarget: Boolean(draft.stackNextId),
      hasContract: Boolean(draft.contract?.trim()),
    });

    void createHabitAction(draft)
      .then((saved) => {
        setHabits((currentHabits) =>
          currentHabits.map((habit) => (habit.id === tempId ? saved : habit)),
        );
      })
      .catch((error: unknown) => {
        clientLogger.warn("Habit creation failed", {
          event: "store.habit.create_failed",
          habitId: tempId,
          message: errorMessage(error),
        });
      });
  }, []);

  const updateHabit = useCallback((id: string, patch: Partial<Habit>) => {
    const version = ++updateHabitVersion.current;
    let preSnapshot: Habit | null = null;
    setHabits((currentHabits) => {
      preSnapshot = currentHabits.find((habit) => habit.id === id) ?? null;
      return currentHabits.map((habit) => (habit.id === id ? { ...habit, ...patch } : habit));
    });

    clientLogger.info("Updating habit", {
      event: "store.habit.update",
      habitId: id,
      fields: changedFields(patch),
    });

    void updateHabitAction(id, patch)
      .then((saved) => {
        if (!saved || version !== updateHabitVersion.current) {
          return;
        }
        setHabits((currentHabits) =>
          currentHabits.map((habit) => (habit.id === id ? { ...habit, ...saved, ...patch } : habit)),
        );
      })
      .catch((error: unknown) => {
        // Roll back the optimistic patch so the UI matches the server.
        if (version === updateHabitVersion.current && preSnapshot) {
          const snapshot = preSnapshot;
          setHabits((currentHabits) =>
            currentHabits.map((habit) => (habit.id === id ? snapshot : habit)),
          );
        }
        const message = errorMessage(error);
        clientLogger.warn("Habit update rolled back", {
          event: "store.habit.update_failed",
          habitId: id,
          fields: changedFields(patch),
          message,
        });
        showToast("Couldn't update habit", message);
      });
  }, [showToast]);

  /**
   * Apply an atomic stack mutation (insert or remove). Optimistically applies
   * the patches locally and reconciles with the server response, or rolls
   * back to the pre-mutation snapshot on failure. Rejected promises throw a
   * thin error with the server-supplied message so callers can surface a
   * modal dialog.
   */
  const applyStackMutation = useCallback(async (input: StackMutationInput) => {
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
      kind: input.kind,
      habitId: "habitId" in input ? input.habitId : undefined,
      count: input.kind === "reorder" ? input.habitIds.length : undefined,
    });

    try {
      const updated = await applyStackMutationAction(input);
      setHabits((currentHabits) => {
        const byId = new Map(currentHabits.map((h) => [h.id, h] as const));
        for (const habit of updated) {
          byId.set(habit.id, habit);
        }
        return Array.from(byId.values());
      });
    } catch (error: unknown) {
      // Roll back optimistic state and rethrow so the caller can show a modal.
      setHabits(snapshot);
      const message = errorMessage(error);
      clientLogger.warn("Habit stack mutation rolled back", {
        event: "store.habit.stack_mutation_failed",
        kind: input.kind,
        habitId: "habitId" in input ? input.habitId : undefined,
        count: input.kind === "reorder" ? input.habitIds.length : undefined,
        message,
      });
      throw new Error(message);
    }
  }, []);

  const deleteHabit = useCallback((id: string) => {
    setHabits((currentHabits) => currentHabits.filter((habit) => habit.id !== id));
    clientLogger.info("Deleting habit", {
      event: "store.habit.delete",
      habitId: id,
    });
    void Promise.resolve(deleteHabitAction(id)).catch((error: unknown) => {
      clientLogger.warn("Habit deletion failed", {
        event: "store.habit.delete_failed",
        habitId: id,
        message: errorMessage(error),
      });
    });
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

    clientLogger.info("Creating journal entry", {
      event: "store.journal.create",
      journalId: tempId,
      dateKey: entry.date ?? todayKey(),
      mood: entry.mood ?? "good",
      tagCount: entry.tags?.length ?? 0,
      hasTitle: Boolean(entry.title?.trim()),
      hasBody: Boolean(entry.body?.trim()),
    });

    void createJournalEntryAction(entry)
      .then((saved) => {
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
              }).catch((error: unknown) => {
                clientLogger.warn("Journal entry reconciliation failed", {
                  event: "store.journal.reconcile_failed",
                  journalId: saved.id,
                  message: errorMessage(error),
                });
              });
            }
            return merged;
          }),
        );
      })
      .catch((error: unknown) => {
        clientLogger.warn("Journal creation failed", {
          event: "store.journal.create_failed",
          journalId: tempId,
          message: errorMessage(error),
        });
      });
  }, []);

  const updateJournal = useCallback((id: string, patch: Partial<JournalEntry>) => {
    const version = ++updateJournalVersion.current;
    // Journal entries are anchored to the day they happened — the date is
    // assigned at creation and is never editable afterwards. Strip any
    // incoming `date` from the patch defensively so neither the optimistic
    // cache nor the server mutation can move an entry to a different day.
    const { date: _ignoredDate, ...safePatch } = patch;
    void _ignoredDate;
    if (id.startsWith("pending-")) {
      pendingJournalPatches.current.set(id, {
        ...(pendingJournalPatches.current.get(id) ?? {}),
        ...safePatch,
      });
    }
    setJournal((currentJournal) =>
      currentJournal.map((entry) => (entry.id === id ? { ...entry, ...safePatch } : entry)),
    );

    clientLogger.info("Updating journal entry", {
      event: "store.journal.update",
      journalId: id,
      fields: changedFields(safePatch),
      isPending: id.startsWith("pending-"),
    });

    void updateJournalEntryAction(id, safePatch)
      .then((saved) => {
        if (!saved || version !== updateJournalVersion.current) {
          return;
        }
        setJournal((currentJournal) =>
          currentJournal.map((entry) => (entry.id === id ? { ...entry, ...saved, ...safePatch } : entry)),
        );
      })
      .catch((error: unknown) => {
        clientLogger.warn("Journal update failed", {
          event: "store.journal.update_failed",
          journalId: id,
          fields: changedFields(safePatch),
          message: errorMessage(error),
        });
      });
  }, []);

  const setIdentity = useCallback((nextIdentity: Identity) => {
    const version = ++identityVersion.current;
    setIdentityState(nextIdentity);
    clientLogger.info("Saving identity", {
      event: "store.identity.save",
      hasStatement: Boolean(nextIdentity.statement.trim()),
      valuesCount: nextIdentity.values.length,
    });
    void saveIdentityAction(nextIdentity)
      .then((saved) => {
        if (version !== identityVersion.current) {
          return;
        }
        setIdentityState((current) => ({ ...current, ...saved, statement: nextIdentity.statement }));
      })
      .catch((error: unknown) => {
        clientLogger.warn("Identity save failed", {
          event: "store.identity.save_failed",
          valuesCount: nextIdentity.values.length,
          message: errorMessage(error),
        });
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

    clientLogger.info("Saving weekly review", {
      event: "store.weekly-review.save",
      weekStartKey,
    });

    void saveWeeklyReviewAction(weekStartKey, answers)
      .then((saved) => {
        setWeeklyReviewState(saved);
        setWeeklyReviews((current) => [
          saved,
          ...current.filter((review) => review.weekStartKey !== saved.weekStartKey),
        ].sort((a, b) => b.weekStartKey.localeCompare(a.weekStartKey)));
      })
      .catch((error: unknown) => {
        clientLogger.warn("Weekly review save failed", {
          event: "store.weekly-review.save_failed",
          weekStartKey,
          message: errorMessage(error),
        });
      });
  }, []);

  const setLessonMode = useCallback((lessonMode: UserPreferences["lessonMode"]) => {
    setLessonModeState(lessonMode);
    setPreferencesState((current) => ({ ...current, lessonMode }));
    clientLogger.info("Setting lesson mode", {
      event: "store.preferences.lesson_mode",
      lessonMode,
    });
    void savePreferencesAction({ lessonMode })
      .then((saved) => {
        setPreferencesState(saved);
        setLessonModeState(saved.lessonMode);
      })
      .catch((error: unknown) => {
        clientLogger.warn("Lesson mode save failed", {
          event: "store.preferences.lesson_mode_failed",
          lessonMode,
          message: errorMessage(error),
        });
      });
  }, []);

  const markLessonRead = useCallback((lessonId: number) => {
    setCompletedLessons((current) => new Set([...current, lessonId]));
    clientLogger.info("Marking lesson read", {
      event: "store.lesson.read",
      lessonId,
    });
    void markLessonReadAction(lessonId)
      .then((completed) => setCompletedLessons(new Set(completed)))
      .catch((error: unknown) => {
        clientLogger.warn("Lesson completion sync failed", {
          event: "store.lesson.read_failed",
          lessonId,
          message: errorMessage(error),
        });
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
    void saveFormationVerdictAction(verdict)
      .then((saved) => {
        if (!saved) {
          return;
        }
        setFormationVerdicts((current) => [
          ...current.filter((item) => item.habitId !== saved.habitId),
          saved,
        ]);
      })
      .catch((error: unknown) => {
        clientLogger.warn("Formation verdict save failed", {
          event: "store.formation.save_failed",
          habitId: verdict.habitId,
          message: errorMessage(error),
        });
      });
  }, []);

  const setPreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferencesState((current) => ({ ...current, ...patch }));
    if (patch.lessonMode) {
      setLessonModeState(patch.lessonMode);
    }
    clientLogger.info("Saving preferences", {
      event: "store.preferences.save",
      fields: changedFields(patch),
    });
    void savePreferencesAction(patch)
      .then((saved) => {
        setPreferencesState(saved);
        setLessonModeState(saved.lessonMode);
      })
      .catch((error: unknown) => {
        clientLogger.warn("Preferences save failed", {
          event: "store.preferences.save_failed",
          fields: changedFields(patch),
          message: errorMessage(error),
        });
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
      applyStackMutation,
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
      applyStackMutation,
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
