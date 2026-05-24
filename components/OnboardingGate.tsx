"use client";

import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { useStoreContext } from "@/components/StoreProvider";

/**
 * OnboardingGate — decides whether to render the first-run onboarding
 * overlay on top of the app shell.
 *
 * Source of truth is the server-side `preferences.onboardingSeen` flag,
 * which is per-user and loaded synchronously into the store from the
 * SSR'd snapshot in `app/(root)/layout.tsx`. Because the value is on the
 * very first client render, we do not need a localStorage mirror — and
 * keeping one would be a bug, because localStorage is shared by every
 * account that signs in on the same browser, so a previous user's
 * "seen" flag would suppress the overlay for a brand-new account.
 *
 * When the user finishes or skips the overlay, `setPreferences` flips
 * the flag optimistically (and persists it server-side), which causes
 * this gate to re-render with `visible` false.
 */
export function OnboardingGate() {
  const { preferences, setPreferences } = useStoreContext();
  const visible = !preferences.onboardingSeen;

  // Persist "seen" so the overlay never appears again for this user.
  // The optimistic update inside setPreferences flips the local flag
  // immediately, which hides the overlay without waiting on the server.
  const complete = () => {
    setPreferences({ onboardingSeen: true });
  };

  return visible ? <OnboardingOverlay onComplete={complete} /> : null;
}
