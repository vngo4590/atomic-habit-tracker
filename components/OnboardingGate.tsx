"use client";

import { useEffect, useState } from "react";

import { OnboardingOverlay } from "@/components/OnboardingOverlay";

const STORE_KEY = "atomicly:store";
const SEEN_KEY = "atomicly:onboarding-seen";

export function OnboardingGate() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    window.queueMicrotask(() => {
      const hasStore = Boolean(window.localStorage.getItem(STORE_KEY));
      const seen = Boolean(window.localStorage.getItem(SEEN_KEY));
      setVisible(!hasStore && !seen);
    });
  }, []);

  const complete = (name?: string) => {
    window.localStorage.setItem(SEEN_KEY, name ? JSON.stringify({ name, seenAt: new Date().toISOString() }) : "true");
    setVisible(false);
  };

  return visible ? <OnboardingOverlay onComplete={complete} /> : null;
}
