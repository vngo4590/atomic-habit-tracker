"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { applyStackMutationAction } from "@/features/stacks/actions";
import {
  createJournalEntryAction,
  markLessonReadAction,
  saveIdentityAction,
  saveWeeklyReviewAction,
  updateJournalEntryAction,
} from "@/features/reflection/actions";
import { savePreferencesAction } from "@/features/settings/actions";
import { adoptPetAction, buryPetAction, deletePetAction, feedPetAction } from "@/features/pet/actions";
import {
  stackInsertPatches as stackInsertPatchesHelper,
  stackRemovePatches as stackRemovePatchesHelper,
  stackReorderPatches as stackReorderPatchesHelper,
  type StackMutationInput,
} from "@/features/stacks";
import { completionRate, longestStreak, streak } from "@/features/habits";
import { useHabitsSlice } from "@/features/habits/store";
import { todayKey } from "@/lib/helpers";
import { clientLogger } from "@/lib/logger-client";
import { useToast } from "@/lib/store/toast";
import { MAX_ALIVE_PETS, feedVitals, simulatePet, tuningFor } from "@/features/pet";
import type {
  Habit,
  Identity,
  JournalEntry,
  Pet,
  PetDraft,
  StoreSnapshot,
  StoreState,
  UserPreferences,
  WeeklyReview,
  WeeklyReviewAnswers,
} from "@/lib/types";

/** Reduce repeated unknown-error handling to a safe, non-sensitive message. */
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
}

/** Report which allowlisted fields are changing without logging their values. */
function changedFields(patch: object) {
  return Object.keys(patch).sort();
}

// Habit metrics now live in the habits feature (`features/habits/model/metrics.ts`).
// They are re-exported here so existing `@/lib/store` callers keep working until
// the store itself is split into feature slices.
export { completionRate, longestStreak, streak };

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
  const { toast, showToast } = useToast();
  const habitsSlice = useHabitsSlice(backendSnapshot, showToast);
  const { setHabits } = habitsSlice;
  const [journal, setJournal] = useState<JournalEntry[]>(backendSnapshot.journal);
  const [identity, setIdentityState] = useState<Identity>(backendSnapshot.identity);
  const [weeklyReview, setWeeklyReviewState] = useState<WeeklyReviewAnswers>(backendSnapshot.weeklyReview);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>(backendSnapshot.weeklyReviews ?? []);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(
    () => new Set(backendSnapshot.completedLessons),
  );
  const [lessonModeState, setLessonModeState] = useState(backendSnapshot.preferences.lessonMode);
  const [preferences, setPreferencesState] = useState<UserPreferences>(backendSnapshot.preferences);
  const [pets, setPets] = useState<Pet[]>(backendSnapshot.pets ?? []);
  const [petFeedsUsedToday, setPetFeedsUsedToday] = useState<number>(backendSnapshot.petFeedsUsedToday ?? 0);
  const updateJournalVersion = useRef(0);
  const pendingJournalPatches = useRef(new Map<string, Partial<JournalEntry>>());
  const identityVersion = useRef(0);

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
      ...habitsSlice,
      applyStackMutation,
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
      habitsSlice,
      addJournal,
      applyStackMutation,
      identity,
      journal,
      weeklyReview,
      weeklyReviews,
      updateJournal,
      completedLessons,
      lessonModeState,
      preferences,
      markLessonRead,
      setLessonMode,
      setPreferences,
      setIdentity,
      setWeeklyReview,
      showToast,
      toast,
      pets,
      petFeedsUsedToday,
      adoptPet,
      feedPet,
      buryPet,
      deletePet,
    ],
  );
}
