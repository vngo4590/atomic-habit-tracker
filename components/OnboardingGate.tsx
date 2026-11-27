"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

import { useStoreContext } from "@/components/StoreProvider";

// Loaded on demand: only first-run users see it, so its code (and the
// animation runtime it uses) stays out of every route's first-load bundle.
// If its chunk fails to load (e.g. offline or a stale deploy), fall back to
// a plain welcome dialog so the user can still dismiss onboarding.
const OnboardingOverlay = dynamic(() =>
  import("@/components/OnboardingOverlay")
    .then((mod) => mod.OnboardingOverlay)
    .catch(() => OnboardingFallback),
);

function OnboardingFallback({ onComplete }: { onComplete: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Remember what had focus before the dialog opened (read during the first
  // render, before anything inside the dialog can take focus).
  const opener = useRef(typeof document === "undefined" ? null : document.activeElement);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = opener.current;
    // showModal() makes the rest of the page inert and traps focus natively.
    if (dialog?.showModal) dialog.showModal();
    else dialog?.setAttribute("open", "");
    dialog?.querySelector("button")?.focus();
    return () => {
      dialog?.close?.();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="overlay"
      aria-labelledby="onboarding-fallback-title"
      onCancel={(event) => {
        // Escape behaves like Continue, matching Skip on the full tour.
        event.preventDefault();
        onComplete();
      }}
    >
      <div className="overlay-card">
        <h2 id="onboarding-fallback-title">Welcome to Atomicly</h2>
        <p>Build tiny habits and cast a daily vote for who you want to become.</p>
        <button type="button" className="btn btn-primary" onClick={onComplete}>
          Continue
        </button>
      </div>
    </dialog>
  );
}

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
