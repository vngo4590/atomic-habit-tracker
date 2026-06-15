"use client";

import { useMemo } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { useMounted } from "@/lib/hooks/useMounted";
import { useNow } from "@/lib/hooks/useNow";
import { todayKey } from "@/lib/helpers";
import {
  buildPetView,
  earnedFoodFrom,
  MAX_ALIVE_PETS,
  type PetRecord,
  type PetView,
  type TemperamentId,
} from "@/lib/pet";
import type { CheckIn, Pet } from "@/lib/types";

import { AdoptPanel } from "./AdoptPanel";
import { PetCard } from "./PetCard";
import styles from "./page.module.css";

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

/**
 * Was a habit's check-in for today actually marked done? History entries are
 * either a bare `true` (legacy) or a CheckIn object — both mean "done" only when
 * truthy / `done === true`.
 */
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
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * PetEcosystem is the heart of the Pet tab: it turns the user's stored pets into
 * living, ticking creatures. It computes today's shared food pool from real
 * habit completions and journalling, renders a grid of living companions with
 * feed controls, shows an adopt panel while there's room, and gathers any pets
 * that have passed away into a small graveyard. All decay/mood is derived live
 * from `useNow`.
 */
export function PetEcosystem() {
  const store = useStoreContext();
  const now = useNow();
  // Guard live, time-dependent rendering until after hydration so the server's
  // "now" never disagrees with the client's first paint (avoids mismatch).
  const mounted = useMounted();
  const hour = new Date(now).getHours();

  // Derive every pet's render-ready view from the stored record + current time.
  const views: PetView[] = useMemo(
    () => store.pets.map((pet) => buildPetView(toRecord(pet), { now, hour })),
    [store.pets, now, hour],
  );

  const alive = views.filter((view) => view.vitals.isAlive);
  const dead = views.filter((view) => !view.vitals.isAlive);

  // Today's shared food pool. Each completed habit is worth the most; every
  // reflective act (journal entry, habit note, weekly review saved today) adds a
  // little extra. We subtract what's already been fed to the ecosystem today.
  const today = todayKey();
  const nowDate = new Date(now);
  const habitsCompleted = store.habits.filter((habit) => isDoneToday(habit.history[today])).length;
  const habitJournals = store.habits.filter((habit) => hasJournalNote(habit.history[today])).length;
  const journalEntries = store.journal.filter((entry) => entry.date === today).length;
  const weeklyReviews = store.weeklyReviews.filter((review) =>
    isSameLocalDay(new Date(review.updatedAt), nowDate),
  ).length;
  const earnedFood = earnedFoodFrom({ habitsCompleted, journalEntries, habitJournals, weeklyReviews });
  const availableFood = Math.max(0, earnedFood - store.petFeedsUsedToday);

  const remainingSlots = Math.max(0, MAX_ALIVE_PETS - alive.length);

  if (!mounted) {
    // Static placeholder during SSR/first paint; replaced once the clock ticks.
    return <p className={styles.loading}>Waking your companions…</p>;
  }

  return (
    <div className={styles.ecosystem}>
      <div className={styles.foodBanner}>
        <span className={styles.foodCount}>{availableFood}</span>
        <span className={styles.foodLabel}>
          food available today · earn more by completing habits & journalling
        </span>
      </div>

      {alive.length > 0 ? (
        <div className={styles.petGrid}>
          {alive.map((view) => (
            <PetCard
              key={view.id}
              view={view}
              availableFood={availableFood}
              onFeed={(amount) => store.feedPet(view.id, amount)}
              onBury={() => store.buryPet(view.id)}
              onDelete={() => store.deletePet(view.id)}
            />
          ))}
        </div>
      ) : (
        <p className={styles.emptyState}>
          Your ecosystem is empty. Adopt a companion below to begin.
        </p>
      )}

      {remainingSlots > 0 ? (
        <AdoptPanel
          remainingSlots={remainingSlots}
          onAdopt={(draft) => store.adoptPet(draft)}
        />
      ) : null}

      {dead.length > 0 ? (
        <section className={styles.graveyard}>
          <span className="eyebrow">In memory</span>
          <div className={styles.petGrid}>
            {dead.map((view) => (
              <PetCard
                key={view.id}
                view={view}
                availableFood={availableFood}
                onFeed={() => undefined}
                onBury={() => store.buryPet(view.id)}
                onDelete={() => store.deletePet(view.id)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
