"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * Returns true on the client, false during SSR.
 * Useful for avoiding hydration mismatches in client-only code
 * (e.g. Framer Motion, browser APIs, window measurements).
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true, // client: always mounted
    () => false, // server: never mounted
  );
}
