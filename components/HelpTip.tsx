"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import styles from "./HelpTip.module.css";

// useLayoutEffect lets us measure the popover and correct its position *before*
// the browser paints, so it never flashes in the wrong place. During SSR there
// is no DOM to measure, so we fall back to useEffect to avoid React's
// "useLayoutEffect does nothing on the server" warning.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * HelpTip — a small, reusable contextual help control.
 *
 * It renders a focusable "?" button that toggles a short explanatory popover.
 * Use it to explain a product mechanic inline (e.g. why a button is disabled)
 * without cluttering the page. The explanation is passed as `children`, so the
 * same control works for any mechanic.
 *
 * Accessibility:
 *   - The trigger is a real `<button type="button">`, so it is keyboard
 *     focusable/operable and never submits a surrounding form.
 *   - `aria-label` gives it an accessible name ("Help" by default).
 *   - `aria-expanded` reflects whether the popover is open.
 *   - `aria-describedby` links the trigger to the popover text so assistive
 *     technology announces the explanation.
 *   - The popover has `role="tooltip"` and can be dismissed with Escape or by
 *     interacting outside it.
 */
export function HelpTip({
  children,
  label = "Help",
  className,
}: {
  /** The explanatory content revealed when the tip is opened. */
  children: ReactNode;
  /** Accessible name for the trigger button. Defaults to "Help". */
  label?: string;
  /** Optional extra class on the wrapper for spacing in a given context. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  // Horizontal correction (px) applied to the popover so it stays inside the
  // viewport. 0 means "perfectly centred over the trigger"; a non-zero value
  // nudges the bubble left/right when the trigger is close to a screen edge.
  const [shift, setShift] = useState(0);

  // Close on Escape (from anywhere) and on any interaction outside the control.
  // Only wire these listeners while the popover is actually open.
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  // Keep the open popover inside the viewport. The bubble is centred over the
  // trigger by default, but on a narrow (mobile) screen a trigger near the edge
  // would push a centred bubble off-screen and clip its text. We measure the
  // trigger's centre and the popover's width, then compute how far to nudge the
  // bubble so both its edges stay within an 8px margin of the viewport.
  useIsomorphicLayoutEffect(() => {
    if (!open) {
      return;
    }

    const reposition = () => {
      const wrapper = wrapperRef.current;
      const popover = popoverRef.current;
      if (!wrapper || !popover) {
        return;
      }

      const margin = 8;
      const wrapperRect = wrapper.getBoundingClientRect();
      // Width is unaffected by the translate transform, so this is the bubble's
      // true rendered width regardless of any shift already applied.
      const popoverWidth = popover.getBoundingClientRect().width;
      const triggerCentre = wrapperRect.left + wrapperRect.width / 2;
      const halfWidth = popoverWidth / 2;
      const leftEdge = triggerCentre - halfWidth;
      const rightEdge = triggerCentre + halfWidth;

      let next = 0;
      if (leftEdge < margin) {
        // Overflowing the left edge: nudge right just enough to clear the margin.
        next = margin - leftEdge;
      } else if (rightEdge > window.innerWidth - margin) {
        // Overflowing the right edge: nudge left just enough to clear the margin.
        next = window.innerWidth - margin - rightEdge;
      }
      setShift(next);
    };

    reposition();
    // Recompute while open so the bubble tracks orientation changes and scroll.
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  return (
    <span ref={wrapperRef} className={`${styles.wrapper} ${className ?? ""}`.trim()}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? popoverId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        ?
      </button>
      {open && (
        <span
          ref={popoverRef}
          id={popoverId}
          role="tooltip"
          className={styles.popover}
          // Dynamic CSS-variable passthrough (allowed by our inline-style
          // policy): the module class owns all static styling; JS only feeds the
          // measured horizontal shift so the bubble stays inside the viewport.
          style={{ "--tip-shift": `${shift}px` } as CSSProperties}
        >
          {children}
        </span>
      )}
    </span>
  );
}
