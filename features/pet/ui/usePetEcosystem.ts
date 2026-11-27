"use client";

import { useMemo } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { todayKey } from "@/lib/helpers";
import { useNow } from "@/lib/hooks/useNow";
import type { CheckIn, Pet } from "@/lib/types";

import { buildPetView, earnedFoodFrom, MAX_ALIVE_PETS, type PetRecord, type PetView, type TemperamentId } from "..";

/**
 * Convert a serialised store `Pet` (ISO-string timestamps) into the engine's
 * `PetRecord` (epoch-ms vitals) so it can be simulated and rendered. Done on the
 * client each tick; the engine re-derives sprite/mood deterministically.
 */
function toRecord(pet: Pet): PetRecord {
  return {
    id: pet.id,
    name: pet.name,
    genome: { seed: pet.seed, temperament: pet.temperament as TemperamentId },
    totalFeeds: pet.totalFeeds,
    vitals: {
      satiety: pet.satiety,
      health: pet.health,
      lastSimAt: Date.parse(pet.lastSimAt),
      lastFedAt: Date.parse(pet.lastFedAt),
      bornAt: Date.parse(pet.bornAt),
      isAlive: pet.isAlive,
      diedAt: pet.diedAt ? Date.parse(pet.diedAt) : null,
    },
  };
}

/** A check-in counts as done when it's a bare `true` (legacy) or `{ done: true }`. */
function isDoneToday(entry: boolean | CheckIn | undefined): boolean {
  if (!entry) return false;
  return typeof entry === "boolean" ? entry : entry.done;
}

/** Does today's check-in carry a written journal note (an extra food source)? */
function hasJournalNote(entry: boolean | CheckIn | undefined): boolean {
  return typeof entry === "object" && entry !== null && Boolean(entry.journal && entry.journal.trim());
}

/** Do two timestamps fall on the same local calendar day? */
function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export interface PetEcosystemState {
  alive: PetView[];
  dead: PetView[];
  /** Food left in today's shared pool (earned minus already fed). */
  availableFood: number;
  /** How many more living pets the user may adopt. */
  remainingSlots: number;
}

/**
 * Derive the live ecosystem from the store: every pet simulated to "now", split
 * into living and passed-away, plus today's shared food pool. Food is earned
 * from real habit completions and reflection (journal entries, check-in notes,
 * weekly reviews saved today) and spent by feeding.
 */
export function usePetEcosystem(): PetEcosystemState {
  const store = useStoreContext();
  const now = useNow();
  const hour = new Date(now).getHours();

  const views = useMemo(
    () => store.pets.map((pet) => buildPetView(toRecord(pet), { now, hour })),
    [store.pets, now, hour],
  );

  const today = todayKey();
  const nowDate = new Date(now);
  const earnedFood = earnedFoodFrom({
    habitsCompleted: store.habits.filter((habit) => isDoneToday(habit.history[today])).length,
    habitJournals: store.habits.filter((habit) => hasJournalNote(habit.history[today])).length,
    journalEntries: store.journal.filter((entry) => entry.date === today).length,
    weeklyReviews: store.weeklyReviews.filter((review) => isSameLocalDay(new Date(review.updatedAt), nowDate))
      .length,
  });

  const alive = views.filter((view) => view.vitals.isAlive);
  return {
    alive,
    dead: views.filter((view) => !view.vitals.isAlive),
    availableFood: Math.max(0, earnedFood - store.petFeedsUsedToday),
    remainingSlots: Math.max(0, MAX_ALIVE_PETS - alive.length),
  };
}
