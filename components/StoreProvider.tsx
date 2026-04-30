"use client";

import {
  createContext,
  type ReactNode,
  useContext,
} from "react";

import { useStore } from "@/lib/store";
import type { StoreSnapshot, StoreState } from "@/lib/types";

const StoreContext = createContext<StoreState | null>(null);

export function StoreProvider({
  children,
  initialSnapshot,
}: {
  children: ReactNode;
  initialSnapshot: StoreSnapshot;
}) {
  const store = useStore(initialSnapshot);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStoreContext() {
  const store = useContext(StoreContext);

  if (!store) {
    throw new Error("useStoreContext must be used within StoreProvider");
  }

  return store;
}
