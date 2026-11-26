"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { clientLogger } from "@/lib/logger-client";

import { SHORTCUTS } from "./nav-items";

/** Typing in a form field must never trigger navigation. */
function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

/**
 * Global single-key navigation shortcuts (see SHORTCUTS). Ignored while the
 * user is typing or holding a modifier, so browser/OS shortcuts like Ctrl+R
 * keep working.
 */
export function useNavShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const key = event.key.toLowerCase();
      const href = SHORTCUTS.get(key);
      if (href) {
        event.preventDefault();
        clientLogger.info("Navigation shortcut used", { event: "nav.shortcut", href, key });
        router.push(href);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
}
