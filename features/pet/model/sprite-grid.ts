/**
 * sprite-grid.ts - colour and pixel-grid helpers used by the sprite generator
 * (sprite.ts): HSL-to-hex conversion, the per-creature palette, a tiny mutable
 * grid with bounds-safe get/set, and per-stage canvas sizes. Pure.
 */

import type { Traits } from "./genome";
import type { Stage } from "./evolution";

/* -------------------------------------------------------------------------- */
/* Colour helpers                                                              */
/* -------------------------------------------------------------------------- */

/** Convert an HSL colour (h in degrees, s/l in 0..100) to a #rrggbb hex string. */
export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lit = l / 100;
  const c = (1 - Math.abs(2 * lit - 1)) * sat;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = lit - c / 2;
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Build the six-colour palette for a creature from its traits. Keys are shared
 * across all stages so a pet keeps a consistent colour identity as it grows.
 */
export function buildPalette(traits: Traits): Record<string, string> {
  return {
    ".": "transparent", // explicit transparent; PixelSprite treats unknown as transparent too
    b: hslToHex(traits.hue, 64, 62), // body
    s: hslToHex(traits.hue, 58, 46), // shade (depth on the lower body)
    d: hslToHex(traits.hue, 52, 22), // dark outline
    h: hslToHex(traits.hue, 70, 84), // highlight
    e: hslToHex(traits.hue, 28, 16), // eye (near-black, slightly tinted)
    a: hslToHex(traits.accentHue, 72, 60), // accent (horns/wings/spots)
  };
}

/* -------------------------------------------------------------------------- */
/* Grid helpers                                                                */
/* -------------------------------------------------------------------------- */

export type Grid = string[][];

/** Allocate a transparent grid of the given size. */
export function blankGrid(width: number, height: number): Grid {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => "."),
  );
}

/** Safely set a cell, ignoring out-of-bounds writes so feature code stays simple. */
export function set(grid: Grid, r: number, c: number, key: string): void {
  if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length) {
    grid[r][c] = key;
  }
}

/** Read a cell, treating out-of-bounds as transparent ("."). */
export function get(grid: Grid, r: number, c: number): string {
  if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length) {
    return grid[r][c];
  }
  return ".";
}

/** Join the grid into the equal-width string rows that <PixelSprite> expects. */
export function toRows(grid: Grid): string[] {
  return grid.map((row) => row.join(""));
}

/** Per-stage canvas dimensions (always odd width so there is a centre column). */
export function dimsForStage(stage: Stage): { width: number; height: number } {
  switch (stage) {
    case "egg":
      return { width: 7, height: 8 };
    case "hatchling":
      return { width: 9, height: 9 };
    case "juvenile":
      return { width: 11, height: 11 };
    case "adult":
      return { width: 13, height: 13 };
    case "elder":
    default:
      return { width: 13, height: 14 };
  }
}
