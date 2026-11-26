"use client";

import { useCallback, useMemo, useState } from "react";

import { adoptPetAction, buryPetAction, deletePetAction, feedPetAction } from "@/features/pet/actions";
import { useReflectionSlice } from "@/features/reflection/store";
import { useSettingsSlice } from "@/features/settings/store";
import { useStacksSlice } from "@/features/stacks/store";
import { completionRate, longestStreak, streak } from "@/features/habits";
import { useHabitsSlice } from "@/features/habits/store";
import { clientLogger } from "@/lib/logger-client";
import { useToast } from "@/lib/store/toast";
import { MAX_ALIVE_PETS, feedVitals, simulatePet, tuningFor } from "@/features/pet";
import type { Pet, PetDraft, StoreSnapshot, StoreState } from "@/lib/types";

/** Reduce repeated unknown-error handling to a safe, non-sensitive message. */
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
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
  const stacksSlice = useStacksSlice(habitsSlice.setHabits);
  const reflectionSlice = useReflectionSlice(backendSnapshot);
  const settingsSlice = useSettingsSlice(backendSnapshot);
  const [pets, setPets] = useState<Pet[]>(backendSnapshot.pets ?? []);
  const [petFeedsUsedToday, setPetFeedsUsedToday] = useState<number>(backendSnapshot.petFeedsUsedToday ?? 0);

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
      ...stacksSlice,
      ...reflectionSlice,
      ...settingsSlice,
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
      stacksSlice,
      reflectionSlice,
      settingsSlice,
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
