"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { todayKey } from "@/lib/helpers";
import { useMounted } from "@/lib/hooks/useMounted";
import { clientLogger } from "@/lib/logger-client";
import {
  availableFood as availableFoodFor,
  canFeed as canFeedFor,
  createInitialPetState,
  feedPet,
  feedsOn,
  getPetCharacter,
  moodFor,
  readPetState,
  satietyFor,
  satietyRatio as satietyRatioFor,
  selectCharacter,
  writePetState,
  type PetCharacter,
  type PetCharacterId,
  type PetMood,
  type PetState,
} from "@/lib/pet";
import type { Habit } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* External store                                                              */
/* -------------------------------------------------------------------------- */
/*
 * The pet lives in a tiny module-level external store read through
 * useSyncExternalStore. This is the React-recommended way to expose a browser
 * value (localStorage) to components without calling setState inside an effect,
 * and it lets every Pet view share one consistent, persisted pet.
 */

/** Stable server snapshot — a fresh pet — so SSR and hydration agree. */
const SERVER_STATE: PetState = createInitialPetState();

/** Cached client state; lazily hydrated from localStorage on first read. */
let cache: PetState | null = null;
const listeners = new Set<() => void>();

/** Read the current pet, hydrating from storage once and caching thereafter. */
function getClientSnapshot(): PetState {
  if (cache === null) {
    cache = readPetState();
  }
  return cache;
}

/** Subscribe a component to pet-state changes; returns an unsubscribe fn. */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Apply an update, persist it, and notify subscribers when it changes. */
function updatePetState(updater: (prev: PetState) => PetState): PetState {
  const prev = getClientSnapshot();
  const next = updater(prev);
  if (next !== prev) {
    cache = next;
    writePetState(next);
    listeners.forEach((listener) => listener());
  }
  return next;
}

/**
 * Test-only hook: drop the cached pet so the next read re-hydrates from the
 * (freshly stubbed) localStorage. Lets each test start from a clean companion.
 */
export function __resetPetStoreForTests(): void {
  cache = null;
}

/** Count habits the user has completed today — the source of the pet's food. */
function countCompletedToday(habits: Habit[], dateKey: string): number {
  return habits.reduce((total, habit) => (habit.history[dateKey] ? total + 1 : total), 0);
}

/** Everything the Pet tab UI needs to render and drive the companion. */
export interface UsePetResult {
  /** True once the browser has hydrated (storage-backed state is trustworthy). */
  ready: boolean;
  /** The adopted character, or null when the user has not chosen one yet. */
  character: PetCharacter | null;
  /** Whether a character has been adopted. */
  hasChosen: boolean;
  /** Times the pet was fed today (drives satiety + mood). */
  feedsToday: number;
  /** Today's satiety value, 0..MAX_SATIETY. */
  satiety: number;
  /** Today's satiety as a 0..1 ratio for the fullness bar. */
  satietyRatio: number;
  /** The pet's current mood stage. */
  mood: PetMood;
  /** Habits completed today (food earned). */
  completedToday: number;
  /** Unspent food tokens available to feed with right now. */
  availableFood: number;
  /** Whether the pet can be fed at this moment. */
  canFeed: boolean;
  /** Lifetime number of feeds, shown as a stat. */
  totalFeeds: number;
  /** Adopt (or switch to) a character. */
  choose: (id: PetCharacterId) => void;
  /** Feed the pet once; returns true when a feed actually happened. */
  feed: () => boolean;
}

/**
 * usePet wires the pure pet logic (lib/pet.ts) to React, browser storage, and
 * the live habit store. It reads how many habits were completed today from the
 * store (real, persisted data) and mirrors the pet's character + daily feeds in
 * localStorage so the companion is remembered across visits.
 */
export function usePet(): UsePetResult {
  const { habits } = useStoreContext();
  const mounted = useMounted();
  const today = todayKey();

  const state = useSyncExternalStore(subscribe, getClientSnapshot, () => SERVER_STATE);

  const completedToday = useMemo(
    () => countCompletedToday(habits, today),
    [habits, today],
  );

  const feedsToday = feedsOn(state, today);
  const character = getPetCharacter(state.characterId);

  const choose = useCallback((id: PetCharacterId) => {
    updatePetState((current) => selectCharacter(current, id));
    clientLogger.info("Pet character chosen", { event: "pet.choose", characterId: id });
  }, []);

  const feed = useCallback((): boolean => {
    let didFeed = false;
    let characterId: PetCharacterId | null = null;
    updatePetState((current) => {
      const result = feedPet(current, today, countCompletedToday(habits, today));
      didFeed = result.fed;
      characterId = current.characterId;
      return result.state;
    });

    if (didFeed) {
      clientLogger.info("Pet fed", { event: "pet.feed", characterId });
    }
    return didFeed;
  }, [habits, today]);

  return {
    ready: mounted,
    character,
    hasChosen: character !== null,
    feedsToday,
    satiety: satietyFor(feedsToday),
    satietyRatio: satietyRatioFor(feedsToday),
    mood: moodFor(feedsToday),
    completedToday,
    availableFood: availableFoodFor(completedToday, feedsToday),
    canFeed: canFeedFor(completedToday, feedsToday),
    totalFeeds: state.totalFeeds,
    choose,
    feed,
  };
}
