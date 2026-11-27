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
 * The shortcut letter for an Alt+Shift+<key> press, or null for any other
 * combination. A modifier is required so stray keystrokes (e.g. from speech
 * input) never navigate (WCAG 2.1.4). `code` is used because Alt/Option+Shift
 * changes `key` into another character on some layouts.
 */
export function shortcutKey(event: KeyboardEvent): string | null {
  if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) {
    return null;
  }
  if (event.code === "Comma") {
    return ",";
  }
  const letter = /^Key([A-Z])$/.exec(event.code);
  return letter ? letter[1].toLowerCase() : null;
}

/**
 * Global Alt+Shift navigation shortcuts (see SHORTCUTS). Ignored while the
 * user is typing in a form field.
 */
export function useNavShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = shortcutKey(event);
      if (!key || isEditableTarget(event.target)) {
        return;
      }
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
