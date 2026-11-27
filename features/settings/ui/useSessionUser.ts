"use client";

import { useCallback, useEffect, useState } from "react";

import { clientLogger } from "@/lib/logger-client";

export interface SessionUser {
  name: string | null;
  email: string | null;
}

export type SessionUserStatus = "loading" | "ready" | "error";

/**
 * Load the signed-in user's profile (name + email) from `/api/v1/session` for
 * the Settings page. Exposes a status so the Profile section can show a
 * skeleton while loading and a retry when the request fails, plus `setUser`
 * so a saved name shows immediately without a refetch.
 */
export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<SessionUserStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/session")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const userData = data?.data?.user as SessionUser | undefined;
        setUser(userData ?? null);
        setStatus(userData ? "ready" : "error");
      })
      .catch((error) => {
        if (cancelled) return;
        clientLogger.error("Settings session load failed", { page: "settings", error });
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((value) => value + 1);
  }, []);

  return { user, status, setUser, retry };
}
