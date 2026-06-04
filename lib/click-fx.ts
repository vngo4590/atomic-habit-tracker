/**
 * click-fx.ts — pure logic for the global click-effect layer (components/ClickFX).
 *
 * Kept separate from the React component so the particle maths can be unit
 * tested without a DOM. Given a click effect and a screen position, it returns
 * a batch of lightweight "particle" descriptors; the component animates them.
 */

import type { ClickEffect } from "@/lib/themes";

/** A single animated particle spawned at a click. Coordinates are in pixels. */
export interface ClickParticle {
  /** Unique key for React lists / AnimatePresence. */
  id: string;
  /** Which effect this particle belongs to (drives how it animates). */
  effect: ClickEffect;
  /** Viewport origin where the user clicked. */
  x: number;
  y: number;
  /** Travel offset from the origin over the particle's life. */
  dx: number;
  dy: number;
  /** Render size in px. */
  size: number;
  /** Rotation applied during travel (deg) — used by sparkle stars. */
  rotate: number;
}

/** Safety cap so rapid clicking can never flood the DOM with particles. */
export const MAX_PARTICLES = 60;

// A small injectable RNG keeps createParticles testable/deterministic.
type Rng = () => number;

/**
 * Build the particles for a single click.
 *
 * @param effect The active theme's signature effect.
 * @param x      Viewport x of the click.
 * @param y      Viewport y of the click.
 * @param rng    Random source (defaults to Math.random; injectable for tests).
 * @returns      Zero or more particles. "none" yields an empty batch.
 */
export function createParticles(
  effect: ClickEffect,
  x: number,
  y: number,
  rng: Rng = Math.random,
): ClickParticle[] {
  if (effect === "none") {
    return [];
  }

  // Unique-enough id prefix per batch so keys never collide across clicks.
  const batch = `${Date.now().toString(36)}-${Math.floor(rng() * 1e6).toString(36)}`;
  const make = (i: number, dx: number, dy: number, size: number, rotate: number): ClickParticle => ({
    id: `${batch}-${i}`,
    effect,
    x,
    y,
    dx,
    dy,
    size,
    rotate,
  });

  if (effect === "ripple") {
    // A single expanding ring.
    return [make(0, 0, 0, 44, 0)];
  }

  if (effect === "bubble") {
    // A few translucent bubbles that drift upward with slight horizontal spread.
    const count = 4;
    return Array.from({ length: count }, (_, i) =>
      make(
        i,
        (rng() - 0.5) * 36,
        -40 - rng() * 48,
        10 + rng() * 14,
        0,
      ),
    );
  }

  // sparkle — small stars fly outward radially in all directions.
  const count = 8;
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + rng() * 0.4;
    const dist = 26 + rng() * 26;
    return make(
      i,
      Math.cos(angle) * dist,
      Math.sin(angle) * dist,
      6 + rng() * 6,
      rng() * 180,
    );
  });
}
