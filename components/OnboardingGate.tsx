"use client";

import { useEffect, useState } from "react";

import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { useStoreContext } from "@/components/StoreProvider";

const SEEN_KEY = "atomicly:onboarding-seen";

export function OnboardingGate() {
  const { preferences, setPreferences } = useStoreContext();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    window.queueMicrotask(() => {
      const seen = Boolean(window.localStorage.getItem(SEEN_KEY));
      setVisible(!preferences.onboardingSeen && !seen);
    });
  }, [preferences.onboardingSeen]);

  const complete = (name?: string) => {
    window.localStorage.setItem(SEEN_KEY, name ? JSON.stringify({ name, seenAt: new Date().toISOString() }) : "true");
    setPreferences({ onboardingSeen: true });
    setVisible(false);
  };

  return visible ? <OnboardingOverlay onComplete={complete} /> : null;
}
