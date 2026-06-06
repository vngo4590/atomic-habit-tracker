"use client";

import { useCallback, useRef } from "react";

import { accentColor } from "@/lib/appearance";

import styles from "./HuePicker.module.css";

export const HUE_MIN = 0;
export const HUE_MAX = 360;

interface HuePickerProps {
  /** Current hue in degrees (0–360). */
  hue: number;
  /**
   * Fires continuously while the user drags or presses keys. Use this to apply
   * the colour live (cheap, DOM-only) for instant visual feedback.
   */
  onChange: (hue: number) => void;
  /**
   * Fires once when an interaction settles (pointer release or key press). Use
   * this to persist the choice so a drag does not spam the backend.
   */
  onCommit?: (hue: number) => void;
  /** Accessible label for the slider. */
  ariaLabel?: string;
}

/** A gradient of the real selectable accent colours, sampled every 30°. */
const TRACK_GRADIENT = `linear-gradient(to right, ${Array.from(
  { length: HUE_MAX / 30 + 1 },
  (_, i) => {
    const hue = i * 30;
    return `${accentColor(hue)} ${(hue / HUE_MAX) * 100}%`;
  },
).join(", ")})`;

function clampHue(value: number): number {
  if (Number.isNaN(value)) return HUE_MIN;
  return Math.min(HUE_MAX, Math.max(HUE_MIN, Math.round(value)));
}

/**
 * HuePicker — a visual spectrum the user drags (or arrows) to choose any accent
 * hue. The track paints the actual selectable colours so the preview is honest,
 * and a thumb shows the live selection. Hue-only by design: chroma and lightness
 * stay fixed (see {@link accentColor}) so every choice reads as a usable accent.
 *
 * It is a controlled, accessible `role="slider"`: it owns no hue state, calls
 * `onChange` live for instant feedback, and `onCommit` once an interaction ends
 * so callers can debounce persistence.
 */
export function HuePicker({ hue, onChange, onCommit, ariaLabel = "Accent hue" }: HuePickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // Translate a pointer x-coordinate into a hue using the track's geometry.
  const hueFromClientX = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return hue;
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) return hue;
    const ratio = (clientX - rect.left) / rect.width;
    return clampHue(ratio * HUE_MAX);
  }, [hue]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      draggingRef.current = true;
      // Keep receiving moves even if the pointer leaves the track. Wrapped
      // because some environments reject capture; the drag still works without.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* capture is a best-effort enhancement, not required */
      }
      onChange(hueFromClientX(event.clientX));
    },
    [hueFromClientX, onChange],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Only react during an active press-drag, never on hover.
      if (!draggingRef.current) return;
      onChange(hueFromClientX(event.clientX));
    },
    [hueFromClientX, onChange],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* nothing to release */
      }
      onCommit?.(hueFromClientX(event.clientX));
    },
    [hueFromClientX, onCommit],
  );

  const handlePointerCancel = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      let next: number | null = null;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowUp":
          next = clampHue(hue + (event.shiftKey ? 10 : 1));
          break;
        case "ArrowLeft":
        case "ArrowDown":
          next = clampHue(hue - (event.shiftKey ? 10 : 1));
          break;
        case "PageUp":
          next = clampHue(hue + 10);
          break;
        case "PageDown":
          next = clampHue(hue - 10);
          break;
        case "Home":
          next = HUE_MIN;
          break;
        case "End":
          next = HUE_MAX;
          break;
        default:
          return;
      }
      event.preventDefault();
      onChange(next);
      onCommit?.(next);
    },
    [hue, onChange, onCommit],
  );

  const position = `${(clampHue(hue) / HUE_MAX) * 100}%`;

  return (
    <div className={styles.picker}>
      <div
        ref={trackRef}
        className={styles.track}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={HUE_MIN}
        aria-valuemax={HUE_MAX}
        aria-valuenow={clampHue(hue)}
        aria-valuetext={`${clampHue(hue)} degrees`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
        /* The spectrum + live thumb position are data-driven, so they must be
           inline CSS variables a generic module class can theme against. */
        style={{ ["--track-gradient" as string]: TRACK_GRADIENT, ["--thumb-pos" as string]: position }}
      >
        <span className={styles.thumb} aria-hidden="true" />
      </div>
      {/* Live preview swatch + numeric readout of the chosen hue. */}
      <span className={styles.readout}>
        <span className={styles.preview} aria-hidden="true" style={{ ["--preview-color" as string]: accentColor(hue) }} />
        <span className="mono">{clampHue(hue)}&deg;</span>
      </span>
    </div>
  );
}
