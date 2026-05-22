"use client";

import {
  createContext,
  type ReactNode,
  useContext,
} from "react";

import { useStore } from "@/lib/store";
import type { StoreSnapshot, StoreState } from "@/lib/types";

const StoreContext = createContext<StoreState | null>(null);

/**
 * Allows tests (and rare external integrations) to inject a fully-formed
 * `StoreState` value directly without spinning up the real `useStore` hook.
 * Use `testStoreContext` from `@/lib/test/fixtures` to build the value.
 */
export function StoreContextProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: StoreState;
}) {
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function StoreProvider({
  children,
  backendSnapshot,
}: {
  children: ReactNode;
  backendSnapshot: StoreSnapshot;
}) {
  const store = useStore(backendSnapshot);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStoreContext() {
  const store = useContext(StoreContext);

  if (!store) {
    throw new Error("useStoreContext must be used within StoreProvider");
  }

  return store;
}
