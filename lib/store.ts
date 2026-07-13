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
import { adoptPetAction, buryPetAction, deletePetAction, feedPetAction } from "@/lib/actions/pets";
import type { StackMutationInput } from "@/lib/contracts/domain";
import { dateAdd, todayKey } from "@/lib/helpers";
import { MAX_ACTIVE_HABITS } from "@/lib/habit-cap";
import { clientLogger } from "@/lib/logger-client";
import { MAX_ALIVE_PETS, feedVitals, simulatePet, tuningFor } from "@/lib/pet";
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
  Pet,
  PetDraft,
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
  pets: [],
  petFeedsUsedToday: 0,
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
  const [pets, setPets] = useState<Pet[]>(backendSnapshot.pets ?? []);
  const [petFeedsUsedToday, setPetFeedsUsedToday] = useState<number>(backendSnapshot.petFeedsUsedToday ?? 0);
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
      .then((result) => {
        if (!result.ok) {
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
          return;
        }
        setHabits((currentHabits) =>
          currentHabits.map((habit) => (habit.id === tempId ? result.habit : habit)),
        );
      })
      .catch((error: unknown) => {
        clientLogger.warn("Habit creation failed", {
          event: "store.habit.create_failed",
          habitId: tempId,
          message: errorMessage(error),
        });
      });
  }, [showToast]);

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

  /**
   * Adopt a new pet from a chosen temperament. The server seeds the unique
   * creature, so we wait for it and append the real pet (no optimistic stand-in,
   * since its look depends on the server-generated seed).
   */
  const adoptPet = useCallback(
    async (draft: PetDraft) => {
      clientLogger.info("Adopting pet", { event: "store.pet.adopt", temperament: draft.temperament });
      try {
        const result = await adoptPetAction(draft);
        if (!result.ok) {
          // Map the server's reason code to a friendly explanation. We use codes
          // (not thrown errors) because Next.js strips server-action error
          // messages in production, which would otherwise hide the real cause.
          const reasons: Record<typeof result.reason, string> = {
            cap: `You can care for at most ${MAX_ALIVE_PETS} pets at once.`,
            monthly: "You can only adopt one pet per month. Release a pet to make room for a new one.",
          };
          clientLogger.warn("Pet adoption refused", { event: "store.pet.adopt_refused", reason: result.reason });
          showToast("Couldn't adopt pet", reasons[result.reason]);
          return;
        }
        setPets((current) => [...current, result.pet]);
        showToast(`${result.pet.name} joined your ecosystem!`, "Keep your habits to help it grow.");
      } catch (error: unknown) {
        clientLogger.warn("Pet adoption failed", { event: "store.pet.adopt_failed", message: errorMessage(error) });
        showToast("Couldn't adopt pet", errorMessage(error));
      }
    },
    [showToast],
  );

  /**
   * Feed a pet optimistically (bump its fullness and the shared feed counter
   * immediately), then reconcile with the server's authoritative result — which
   * may have clamped the amount to the available food or the pet's capacity.
   */
  const feedPet = useCallback(
    async (petId: string, amount: number) => {
      let prevPets: Pet[] = [];
      let prevFeeds = 0;
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();

      setPets((current) => {
        prevPets = current;
        return current.map((pet) => {
          if (pet.id !== petId || !pet.isAlive) return pet;
          // Advance the pet's vitals to *now* before applying the feed, exactly
          // like the server does. Using the stored (possibly days-old) satiety
          // here would make a hungry pet's bar jump to full and then snap back
          // once the server's true value arrives. Simulating first keeps the
          // optimistic bar in step with the authoritative result.
          const live = simulatePet(
            {
              satiety: pet.satiety,
              health: pet.health,
              lastSimAt: Date.parse(pet.lastSimAt),
              lastFedAt: Date.parse(pet.lastFedAt),
              bornAt: Date.parse(pet.bornAt),
              isAlive: pet.isAlive,
              diedAt: pet.diedAt ? Date.parse(pet.diedAt) : null,
            },
            tuningFor(pet.temperament),
            nowMs,
          );
          const fed = feedVitals(live, amount, nowMs);
          return {
            ...pet,
            satiety: fed.satiety,
            health: fed.health,
            totalFeeds: pet.totalFeeds + amount,
            lastFedAt: nowIso,
            lastSimAt: nowIso,
          };
        });
      });
      setPetFeedsUsedToday((current) => {
        prevFeeds = current;
        return current + amount;
      });

      clientLogger.info("Feeding pet", { event: "store.pet.feed", petId, amount });

      try {
        const result = await feedPetAction(petId, amount);
        if (!result.ok) {
          setPets(result.reason === "dead" && result.pet
            ? prevPets.map((pet) => (pet.id === petId ? result.pet! : pet))
            : prevPets);
          setPetFeedsUsedToday(prevFeeds);
          const reasons: Record<typeof result.reason, string> = {
            no_food: "Complete a habit to earn food first.",
            full: "This pet is already full.",
            dead: "This pet has passed away.",
            not_found: "We couldn't find that pet.",
          };
          showToast("Couldn't feed pet", reasons[result.reason]);
          return;
        }

        // Reconcile with the authoritative pet and the exact amount it ate.
        setPets((current) => current.map((pet) => (pet.id === petId ? result.pet : pet)));
        setPetFeedsUsedToday(prevFeeds + result.fedAmount);
        if (result.evolved) {
          showToast(`${result.pet.name} evolved!`, "A new form emerges.");
        }
      } catch (error: unknown) {
        setPets(prevPets);
        setPetFeedsUsedToday(prevFeeds);
        clientLogger.warn("Pet feed failed", { event: "store.pet.feed_failed", petId, message: errorMessage(error) });
        showToast("Couldn't feed pet", errorMessage(error));
      }
    },
    [showToast],
  );

  /** Lay a dead pet to rest, removing it from the graveyard (optimistically). */
  const buryPet = useCallback(
    async (petId: string) => {
      let prevPets: Pet[] = [];
      setPets((current) => {
        prevPets = current;
        return current.filter((pet) => pet.id !== petId);
      });
      clientLogger.info("Burying pet", { event: "store.pet.bury", petId });
      try {
        const buried = await buryPetAction(petId);
        if (!buried) {
          setPets(prevPets);
          showToast("Couldn't lay pet to rest");
        }
      } catch (error: unknown) {
        setPets(prevPets);
        clientLogger.warn("Pet bury failed", { event: "store.pet.bury_failed", petId, message: errorMessage(error) });
        showToast("Couldn't lay pet to rest", errorMessage(error));
      }
    },
    [showToast],
  );

  /**
   * Release any pet (alive or dead) from the ecosystem at the user's request.
   * Optimistically removes it from the grid; releasing also frees this month's
   * adoption slot so the user can adopt a fresh pet immediately.
   */
  const deletePet = useCallback(
    async (petId: string) => {
      let prevPets: Pet[] = [];
      setPets((current) => {
        prevPets = current;
        return current.filter((pet) => pet.id !== petId);
      });
      clientLogger.info("Releasing pet", { event: "store.pet.delete", petId });
      try {
        const deleted = await deletePetAction(petId);
        if (!deleted) {
          setPets(prevPets);
          showToast("Couldn't release pet");
        }
      } catch (error: unknown) {
        setPets(prevPets);
        clientLogger.warn("Pet delete failed", { event: "store.pet.delete_failed", petId, message: errorMessage(error) });
        showToast("Couldn't release pet", errorMessage(error));
      }
    },
    [showToast],
  );

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
      pets,
      petFeedsUsedToday,
      adoptPet,
      feedPet,
      buryPet,
      deletePet,
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
      pets,
      petFeedsUsedToday,
      adoptPet,
      feedPet,
      buryPet,
      deletePet,
    ],
  );
}
