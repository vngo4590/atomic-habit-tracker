"use client";

/**
 * Pet slice of the client store: the user's pets and today's shared feed
 * counter, plus adopt / feed / bury / release. Composed into the app-wide
 * `StoreState` by `useStore` in `lib/store`. Writes go through the shared
 * `optimistic()` helper so rollback, logging and toasts stay consistent.
 */

import { useCallback, useMemo, useState } from "react";

import { clientLogger } from "@/lib/logger-client";
import { optimistic, type ShowToast } from "@/lib/store/optimistic";
import type { Pet, PetDraft, StoreSnapshot, StoreState } from "@/lib/types";

import { adoptPetAction, buryPetAction, deletePetAction, feedPetAction } from "./actions";
import { MAX_ALIVE_PETS } from "./model/pet-view";
import { feedVitals, simulatePet, tuningFor } from "./model/simulation";

export type PetSlice = Pick<StoreState, "pets" | "petFeedsUsedToday" | "adoptPet" | "feedPet" | "buryPet" | "deletePet">;

export function usePetSlice(snapshot: Pick<StoreSnapshot, "pets" | "petFeedsUsedToday">, showToast: ShowToast): PetSlice {
  const [pets, setPets] = useState<Pet[]>(snapshot.pets ?? []);
  const [petFeedsUsedToday, setPetFeedsUsedToday] = useState<number>(snapshot.petFeedsUsedToday ?? 0);

  /**
   * Optimistically remove a pet from the grid, restoring it when the server
   * refuses (`false`) or fails. Shared by bury and release.
   */
  const removePet = useCallback(
    async (petId: string, action: (id: string) => Promise<boolean>, log: { info: string; event: string; failedLog: string }, toastTitle: string) => {
      await optimistic({
        apply: () => {
          let prevPets: Pet[] = [];
          setPets((current) => {
            prevPets = current;
            return current.filter((pet) => pet.id !== petId);
          });
          clientLogger.info(log.info, { event: log.event, petId });
          return () => setPets(prevPets);
        },
        action: () => action(petId),
        isRefused: (removed) => !removed,
        onRefused: () => showToast(toastTitle),
        failure: { log: log.failedLog, event: `${log.event}_failed`, context: { petId }, toast: toastTitle },
        showToast,
      });
    },
    [showToast],
  );

  /**
   * Adopt a new pet from a chosen temperament. The server seeds the unique
   * creature, so we wait for it and append the real pet (no optimistic stand-in,
   * since its look depends on the server-generated seed).
   */
  const adoptPet = useCallback(
    async (draft: PetDraft) => {
      clientLogger.info("Adopting pet", { event: "store.pet.adopt", temperament: draft.temperament });
      await optimistic({
        action: () => adoptPetAction(draft),
        isRefused: (result) => !result.ok,
        onRefused: (result) => {
          if (result.ok) {
            return;
          }
          // Map the server's reason code to a friendly explanation. We use codes
          // (not thrown errors) because Next.js strips server-action error
          // messages in production, which would otherwise hide the real cause.
          const reasons: Record<typeof result.reason, string> = {
            cap: `You can care for at most ${MAX_ALIVE_PETS} pets at once.`,
            monthly: "You can only adopt one pet per month. Release a pet to make room for a new one.",
          };
          clientLogger.warn("Pet adoption refused", { event: "store.pet.adopt_refused", reason: result.reason });
          showToast("Couldn't adopt pet", reasons[result.reason]);
        },
        onSuccess: (result) => {
          if (!result.ok) {
            return;
          }
          setPets((current) => [...current, result.pet]);
          showToast(`${result.pet.name} joined your ecosystem!`, "Keep your habits to help it grow.");
        },
        failure: { log: "Pet adoption failed", event: "store.pet.adopt_failed", toast: "Couldn't adopt pet" },
        showToast,
      });
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

      await optimistic({
        apply: () => {
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

          return () => {
            setPets(prevPets);
            setPetFeedsUsedToday(prevFeeds);
          };
        },
        action: () => feedPetAction(petId, amount),
        isRefused: (result) => !result.ok,
        onRefused: (result) => {
          if (result.ok) {
            return;
          }
          // The rollback already restored the pre-feed state; a pet that died
          // meanwhile is replaced by the server's authoritative record.
          if (result.reason === "dead" && result.pet) {
            const deadPet = result.pet;
            setPets(prevPets.map((pet) => (pet.id === petId ? deadPet : pet)));
          }
          const reasons: Record<typeof result.reason, string> = {
            no_food: "Complete a habit to earn food first.",
            full: "This pet is already full.",
            dead: "This pet has passed away.",
            not_found: "We couldn't find that pet.",
          };
          showToast("Couldn't feed pet", reasons[result.reason]);
        },
        onSuccess: (result) => {
          if (!result.ok) {
            return;
          }
          // Reconcile with the authoritative pet and the exact amount it ate.
          setPets((current) => current.map((pet) => (pet.id === petId ? result.pet : pet)));
          setPetFeedsUsedToday(prevFeeds + result.fedAmount);
          if (result.evolved) {
            showToast(`${result.pet.name} evolved!`, "A new form emerges.");
          }
        },
        failure: { log: "Pet feed failed", event: "store.pet.feed_failed", context: { petId }, toast: "Couldn't feed pet" },
        showToast,
      });
    },
    [showToast],
  );

  /** Lay a dead pet to rest, removing it from the graveyard (optimistically). */
  const buryPet = useCallback(
    (petId: string) =>
      removePet(
        petId,
        buryPetAction,
        { info: "Burying pet", event: "store.pet.bury", failedLog: "Pet bury failed" },
        "Couldn't lay pet to rest",
      ),
    [removePet],
  );

  /**
   * Release any pet (alive or dead) from the ecosystem at the user's request.
   * Optimistically removes it from the grid; releasing also frees this month's
   * adoption slot so the user can adopt a fresh pet immediately.
   */
  const deletePet = useCallback(
    (petId: string) =>
      removePet(
        petId,
        deletePetAction,
        { info: "Releasing pet", event: "store.pet.delete", failedLog: "Pet delete failed" },
        "Couldn't release pet",
      ),
    [removePet],
  );

  return useMemo(
    () => ({ pets, petFeedsUsedToday, adoptPet, feedPet, buryPet, deletePet }),
    [pets, petFeedsUsedToday, adoptPet, feedPet, buryPet, deletePet],
  );
}
