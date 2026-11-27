"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * useFocusTrap — keyboard behaviour for a modal dialog (MASTER.md: "focus
 * trap, Esc, return focus"). Attach the returned ref to the dialog element.
 *
 *  • On open, focus moves inside the dialog (unless a child already took it,
 *    e.g. via `autoFocus`).
 *  • Tab / Shift+Tab wrap around inside the dialog, so the page behind it is
 *    unreachable; if focus has fallen out (e.g. its button unmounted), Tab
 *    brings it back in.
 *  • Escape calls `onEscape`.
 *  • On close, focus returns to whatever was focused before it opened, or to
 *    the page's main region when that control no longer exists.
 */
export function useFocusTrap<T extends HTMLElement>(onEscape: () => void) {
  const ref = useRef<T>(null);
  const onEscapeRef = useRef(onEscape);
  // Read during the first render: a child's `autoFocus` runs before effects,
  // so by the time the effect below runs, focus is already inside the dialog.
  const openerRef = useRef(typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null));

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const opener = openerRef.current;
    const focusables = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

    if (ref.current && !ref.current.contains(document.activeElement)) {
      (focusables()[0] ?? ref.current).focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const container = ref.current;
      if (!container) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!container.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (opener?.isConnected && opener !== document.body) {
        opener.focus();
        return;
      }
      // The opener is gone (e.g. its row was removed); land on the main region.
      const main = document.querySelector<HTMLElement>("main");
      if (main) {
        if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
        main.focus();
      }
    };
  }, []);

  return ref;
}
