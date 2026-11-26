"use client";

/**
 * Store toast: the short-lived message shown after a store action (a vote
 * cast, a refused create, a failed save). Every feature slice receives
 * `showToast` so user feedback looks the same everywhere.
 */

import { useCallback, useState } from "react";

import type { ToastState } from "@/lib/types";

/** How long a toast stays on screen, in milliseconds. */
const TOAST_DURATION_MS = 2400;

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((msg: string, sub?: string) => {
    const id = Date.now();
    setToast({ msg, sub, id });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, TOAST_DURATION_MS);
  }, []);

  return { toast, showToast };
}
