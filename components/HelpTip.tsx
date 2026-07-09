"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import styles from "./HelpTip.module.css";

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
        <span id={popoverId} role="tooltip" className={styles.popover}>
          {children}
        </span>
      )}
    </span>
  );
}
