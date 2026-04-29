"use client";

import {
  createContext,
  type ReactNode,
  useContext,
} from "react";

import { useStore } from "@/lib/store";
import type { StoreState } from "@/lib/types";

const StoreContext = createContext<StoreState | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useStore();

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStoreContext() {
  const store = useContext(StoreContext);

  if (!store) {
    throw new Error("useStoreContext must be used within StoreProvider");
  }

  return store;
}
