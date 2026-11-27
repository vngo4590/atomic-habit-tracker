"use client";

/**
 * Client store composition root.
 *
 * The store is an in-memory, optimistic cache seeded from the server snapshot
 * loaded in `app/(root)/layout.tsx` — it is not a persistence layer. Each
 * feature owns its slice (`features/<name>/store.ts`); `useStore` composes
 * them into the single `StoreState` that `StoreProvider` hands to pages, so
 * components keep one stable API (see ADR-0002).
 */

import { useMemo } from "react";

import { completionRate, longestStreak, streak } from "@/features/habits";
import { useHabitsSlice } from "@/features/habits/store";
import { usePetSlice } from "@/features/pet/store";
import { useReflectionSlice } from "@/features/reflection/store";
import { useSettingsSlice } from "@/features/settings/store";
import { useStacksSlice } from "@/features/stacks/store";
import type { StoreSnapshot, StoreState } from "@/lib/types";

import { defaultSnapshot } from "./default-snapshot";
import { useToast } from "./toast";

export { defaultSnapshot };

export function useStore(backendSnapshot: StoreSnapshot = defaultSnapshot): StoreState {
  const { toast, showToast } = useToast();
  const habitsSlice = useHabitsSlice(backendSnapshot, showToast);
  // Stacks are a view over habits, so the stacks slice patches the habit list.
  const stacksSlice = useStacksSlice(habitsSlice.setHabits);
  const reflectionSlice = useReflectionSlice(backendSnapshot);
  const settingsSlice = useSettingsSlice(backendSnapshot, showToast);
  const petSlice = usePetSlice(backendSnapshot, showToast);

  return useMemo(
    () => ({
      ...habitsSlice,
      ...stacksSlice,
      ...reflectionSlice,
      ...settingsSlice,
      ...petSlice,
      toast,
      showToast,
      streak,
      longestStreak,
      completionRate,
    }),
    [habitsSlice, stacksSlice, reflectionSlice, settingsSlice, petSlice, toast, showToast],
  );
}
