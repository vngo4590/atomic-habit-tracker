"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import styles from "./HelpTip.module.css";

// useLayoutEffect lets us measure the popover and correct its position *before*
// the browser paints, so it never flashes in the wrong place. During SSR there
// is no DOM to measure, so we fall back to useEffect to avoid React's
// "useLayoutEffect does nothing on the server" warning.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Elements that are pinned to the top of the screen and would visually cover
 *  an upward-opening popover. On mobile the navigation hamburger is fixed to
 *  the top-left corner; on desktop it is `display: none` and reports no box. */
const TOP_OBSTRUCTION_SELECTORS = [".mobile-menu-btn"];

/**
 * Returns the lowest pixel occupied by any fixed element at the top of the
 * screen, i.e. the highest point an upward-opening popover may reach before it
 * would disappear behind that element. Returns 0 when nothing is in the way.
 */
function obstructedTop(): number {
  if (typeof document === "undefined") {
    return 0;
  }

  let bottom = 0;
  for (const selector of TOP_OBSTRUCTION_SELECTORS) {
    for (const element of Array.from(document.querySelectorAll(selector))) {
      const rect = element.getBoundingClientRect();
      // A hidden element (desktop) has no box, so it obstructs nothing.
      if (rect.width === 0 && rect.height === 0) {
        continue;
      }
      // Only count elements anchored near the top of the viewport.
      if (rect.top > window.innerHeight / 2) {
        continue;
      }
      bottom = Math.max(bottom, rect.bottom);
    }
  }
  return bottom;
}

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
  // Where the bubble sits relative to the trigger, and how far it is nudged
  // sideways to stay on screen:
  //   - `shift`: horizontal correction in px. 0 means "perfectly centred over
  //     the trigger"; a non-zero value slides the bubble left/right when the
  //     trigger is close to a screen edge.
  //   - `placement`: "top" (the default, bubble above the trigger) flips to
  //     "bottom" when there isn't enough clear room above — otherwise the
  //     bubble would slide under the fixed mobile menu button or off-screen.
  const [position, setPosition] = useState<{ shift: number; placement: "top" | "bottom" }>({
    shift: 0,
    placement: "top",
  });

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

  // Keep the open popover inside the viewport. The bubble is centred above the
  // trigger by default, but two things can push it out of view:
  //   1. On a narrow (mobile) screen a trigger near a side edge would push a
  //      centred bubble off-screen and clip its text -> we nudge it sideways.
  //   2. A trigger near the top of the page has no room above it, so the bubble
  //      would slide underneath the fixed mobile menu button (or off the top of
  //      the screen) -> we flip it to sit below the trigger instead.
  // We measure the trigger and the bubble on open (and on resize/scroll) and
  // recompute both corrections together.
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
      // Width/height are unaffected by the translate transform, so these are the
      // bubble's true rendered size regardless of any shift already applied.
      const popoverRect = popover.getBoundingClientRect();
      const popoverWidth = popoverRect.width;
      const popoverHeight = popoverRect.height;
      const triggerCentre = wrapperRect.left + wrapperRect.width / 2;
      const halfWidth = popoverWidth / 2;
      const leftEdge = triggerCentre - halfWidth;
      const rightEdge = triggerCentre + halfWidth;

      let shift = 0;
      if (leftEdge < margin) {
        // Overflowing the left edge: nudge right just enough to clear the margin.
        shift = margin - leftEdge;
      } else if (rightEdge > window.innerWidth - margin) {
        // Overflowing the right edge: nudge left just enough to clear the margin.
        shift = window.innerWidth - margin - rightEdge;
      }

      // Anything fixed to the top of the screen (on mobile, the hamburger menu
      // button) eats into the usable space above the trigger. Treat the bottom
      // of that element as the real ceiling so the bubble is never hidden
      // behind it.
      const topBoundary = Math.max(margin, obstructedTop() + margin);
      const roomAbove = wrapperRect.top - topBoundary;
      const roomBelow = window.innerHeight - margin - wrapperRect.bottom;
      const spaceNeeded = popoverHeight + margin;
      // Prefer the default "above" placement; only flip below when the bubble
      // genuinely does not fit above AND there is more room below.
      const placement: "top" | "bottom" =
        roomAbove < spaceNeeded && roomBelow > roomAbove ? "bottom" : "top";

      setPosition((current) =>
        current.shift === shift && current.placement === placement
          ? current
          : { shift, placement },
      );
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
          // Drives the CSS rule that puts the bubble above or below the trigger.
          data-placement={position.placement}
          // Dynamic CSS-variable passthrough (allowed by our inline-style
          // policy): the module class owns all static styling; JS only feeds the
          // measured horizontal shift so the bubble stays inside the viewport.
          style={{ "--tip-shift": `${position.shift}px` } as CSSProperties}
        >
          {children}
        </span>
      )}
    </span>
  );
}
