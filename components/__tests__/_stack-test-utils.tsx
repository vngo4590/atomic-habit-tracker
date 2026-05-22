import { type ReactNode } from "react";

import { StoreContextProvider } from "@/components/StoreProvider";
import { testStoreContext } from "@/lib/test/fixtures";
import type { Habit, StoreState } from "@/lib/types";

/**
 * Test helper that wraps children in a `StoreContextProvider` with a stub
 * store. Tests for components that call `useStoreContext()` should use this
 * to inject `habits` and override individual store methods (most commonly
 * `applyStackMutation` and `updateHabit`).
 */
export function StackContextProvider({
  children,
  habits,
  applyStackMutation,
  updateHabit,
}: {
  children: ReactNode;
  habits: Habit[];
  applyStackMutation?: StoreState["applyStackMutation"];
  updateHabit?: StoreState["updateHabit"];
}) {
  const base = testStoreContext({ habits });
  const value: StoreState = {
    ...base,
    habits,
    applyStackMutation: applyStackMutation ?? (async () => {}),
    updateHabit: updateHabit ?? (() => {}),
  };
  return <StoreContextProvider value={value}>{children}</StoreContextProvider>;
}
