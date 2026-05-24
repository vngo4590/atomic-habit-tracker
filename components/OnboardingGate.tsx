"use client";

import { useEffect, useState } from "react";

import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { useStoreContext } from "@/components/StoreProvider";

/** localStorage key used as a same-browser mirror so we don't flash the
    overlay before the server-side `onboardingSeen` preference loads. */
const SEEN_KEY = "atomicly:onboarding-seen";

/**
 * OnboardingGate — decides whether to render the first-run onboarding
 * overlay on top of the app shell. It checks both the server-backed
 * `preferences.onboardingSeen` flag and a localStorage mirror so the
 * overlay never reappears after a user has dismissed or completed it.
 *
 * The overlay no longer collects a name (registration already does), so
 * the gate just persists "seen" and hides itself when `onComplete` fires.
 */
export function OnboardingGate() {
  const { preferences, setPreferences } = useStoreContext();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    window.queueMicrotask(() => {
      const seen = Boolean(window.localStorage.getItem(SEEN_KEY));
      setVisible(!preferences.onboardingSeen && !seen);
    });
  }, [preferences.onboardingSeen]);

  // Persist "seen" both client- and server-side, then close the overlay.
  const complete = () => {
    window.localStorage.setItem(SEEN_KEY, "true");
    setPreferences({ onboardingSeen: true });
    setVisible(false);
  };

  return visible ? <OnboardingOverlay onComplete={complete} /> : null;
}
