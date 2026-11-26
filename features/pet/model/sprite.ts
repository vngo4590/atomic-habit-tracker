/**
 * sprite.ts — turns a pet's genome + life stage into pixel art.
 *
 * Plain-language summary:
 *   This is the "artist" of the pet system. Given a creature's DNA (genome) and
 *   how grown-up it is (stage), it deterministically draws a small, bilaterally
 *   symmetric pixel creature — a body, eyes, and stage-appropriate features like
 *   ears, horns, wings and spots. The output is the exact same shape the old
 *   hand-drawn roster produced ({ pixels, palette }), so the existing
 *   <PixelSprite> component can render it without any changes.
 *
 * How it stays "cute" and recognisable:
 *   - Every creature is mirrored left-to-right, which reads as a face/animal.
 *   - Colours come from a curated, temperament-derived palette (see genome.ts),
 *     never raw randomness, so nothing looks muddy.
 *   - Bigger stages reuse the same silhouette and grow new features, so a pet
 *     looks like itself getting older rather than a brand-new animal.
 *
 * Everything here is pure: same (genome, stage) always yields the same art.
 */

import {
  decodeTraits,
  randInt,
  rngFor,
  type Genome,
  type Traits,
} from "./genome";
import { visibleFeatures, type Stage } from "./evolution";
import { blankGrid, buildPalette, dimsForStage, get, set, toRows, type Grid } from "./sprite-grid";

export { dimsForStage };

/** The render-ready art: equal-width rows of palette keys, plus the palette. */
export interface Sprite {
  /** Maps each pixel key to a CSS colour. "." (and unknown keys) = transparent. */
  palette: Record<string, string>;
  /** Equal-width rows of single-character palette keys describing the art. */
  pixels: string[];
}

/* -------------------------------------------------------------------------- */
/* The egg: a special pre-hatch form                                           */
/* -------------------------------------------------------------------------- */

/** Draw a simple speckled egg — the universal "not hatched yet" look. */
function drawEgg(grid: Grid): void {
  const height = grid.length;
  const width = grid[0].length;
  const center = Math.floor(width / 2);
  // A teardrop/egg outline: narrow at the top, rounded at the bottom.
  for (let r = 0; r < height; r += 1) {
    const t = r / (height - 1);
    // Half-width grows from a point at the top to a rounded base.
    const half = Math.round((center - 0.2) * Math.sin(Math.PI * (0.2 + 0.78 * t)));
    for (let o = 0; o <= half; o += 1) {
      const isEdge = o === half;
      set(grid, r, center - o, isEdge ? "d" : "b");
      set(grid, r, center + o, isEdge ? "d" : "b");
    }
  }
  // A couple of symmetric accent speckles hint at the colour inside.
  set(grid, Math.floor(height * 0.5), center - 1, "a");
  set(grid, Math.floor(height * 0.5), center + 1, "a");
  set(grid, Math.floor(height * 0.68), center, "a");
}

/* -------------------------------------------------------------------------- */
/* The body + features for hatched stages                                      */
/* -------------------------------------------------------------------------- */

/** Shape weight (0..1) describing how wide the body is at vertical fraction t. */
function shapeWeight(traits: Traits, t: number): number {
  const base = Math.sin(Math.PI * t); // rounded: widest in the middle
  switch (traits.bodyShape) {
    case "tall":
      return Math.pow(base, 1.3) * 0.82;
    case "wide":
      return Math.pow(base, 0.7);
    case "teardrop":
      // Narrow at the top, full and round at the bottom.
      return Math.sin(Math.PI * (0.25 + 0.7 * t));
    case "round":
    default:
      return base;
  }
}

/** Fill the symmetric body silhouette and return its vertical bounds. */
function drawBody(
  grid: Grid,
  traits: Traits,
  jitterRng: () => number,
): { center: number; bodyTop: number; bodyBottom: number; maxHalf: number } {
  const height = grid.length;
  const width = grid[0].length;
  const center = Math.floor(width / 2);
  const bodyTop = 2; // leave the top rows for ears/horns
  const bodyBottom = height - 2; // leave the last row for feet
  const maxHalf = center - 1;

  for (let r = bodyTop; r <= bodyBottom; r += 1) {
    const t = (r - bodyTop) / (bodyBottom - bodyTop);
    const weight = shapeWeight(traits, t) * (0.78 + 0.22 * traits.plumpness);
    // A tiny symmetric jitter keeps creatures from looking machine-perfect.
    const jitter = randInt(jitterRng, 0, 1) === 1 && r > bodyTop && r < bodyBottom ? 1 : 0;
    const half = Math.min(maxHalf, Math.max(0, Math.round(maxHalf * weight) + jitter));
    for (let o = 0; o <= half; o += 1) {
      set(grid, r, center - o, "b");
      set(grid, r, center + o, "b");
    }
  }

  // Feet: two small nubs under the widest part of the base.
  set(grid, bodyBottom + 1, center - 1, "b");
  set(grid, bodyBottom + 1, center + 1, "b");

  return { center, bodyTop, bodyBottom, maxHalf };
}

/** Turn the outermost body pixels into a dark outline for a clean silhouette. */
function applyOutline(grid: Grid): void {
  const height = grid.length;
  const width = grid[0].length;
  const isBody = (r: number, c: number) => {
    const v = get(grid, r, c);
    return v === "b" || v === "s";
  };
  for (let r = 0; r < height; r += 1) {
    for (let c = 0; c < width; c += 1) {
      if (!isBody(r, c)) continue;
      // A body cell with any transparent orthogonal neighbour sits on the edge.
      if (
        get(grid, r - 1, c) === "." ||
        get(grid, r + 1, c) === "." ||
        get(grid, r, c - 1) === "." ||
        get(grid, r, c + 1) === "."
      ) {
        grid[r][c] = "d";
      }
    }
  }
}

/** Add soft lower-body shading on interior cells for a sense of volume. */
function applyShading(
  grid: Grid,
  bounds: { center: number; bodyTop: number; bodyBottom: number },
): void {
  const shadeFrom = bounds.bodyTop + Math.round((bounds.bodyBottom - bounds.bodyTop) * 0.62);
  for (let r = shadeFrom; r <= bounds.bodyBottom; r += 1) {
    for (let c = 0; c < grid[0].length; c += 1) {
      if (get(grid, r, c) === "b") {
        grid[r][c] = "s";
      }
    }
  }
}

/** Place symmetric eyes according to the creature's eye style. */
function drawEyes(
  grid: Grid,
  traits: Traits,
  bounds: { center: number; bodyTop: number; bodyBottom: number; maxHalf: number },
): void {
  const eyeRow = bounds.bodyTop + Math.max(1, Math.round((bounds.bodyBottom - bounds.bodyTop) * 0.35));
  const spread = Math.max(1, Math.round(bounds.maxHalf * 0.5));
  const leftC = bounds.center - spread;
  const rightC = bounds.center + spread;

  // Only draw an eye where there is body to draw it on.
  const place = (r: number, c: number, key: string) => {
    if (get(grid, r, c) === "b" || get(grid, r, c) === "s") {
      set(grid, r, c, key);
    }
  };

  place(eyeRow, leftC, "e");
  place(eyeRow, rightC, "e");

  if (traits.eyeStyle === "wide") {
    place(eyeRow, leftC - 0, "e");
    place(eyeRow - 0, rightC, "e");
    place(eyeRow + 1, leftC, "e");
    place(eyeRow + 1, rightC, "e");
  } else if (traits.eyeStyle === "sparkle") {
    // A single bright highlight pixel inside each eye reads as a sparkle.
    set(grid, eyeRow, leftC, "e");
    set(grid, eyeRow, rightC, "e");
    set(grid, eyeRow - 1, leftC, "h");
    set(grid, eyeRow - 1, rightC, "h");
  } else if (traits.eyeStyle === "sleepy") {
    // Sleepy eyes sit one row lower and stay small/calm.
    set(grid, eyeRow + 1, leftC, "e");
    set(grid, eyeRow + 1, rightC, "e");
  }
}

/** Draw the stage-gated extra features (ears, horns, wings, spots, belly). */
function drawFeatures(
  grid: Grid,
  traits: Traits,
  stage: Stage,
  bounds: { center: number; bodyTop: number; bodyBottom: number; maxHalf: number },
  spotRng: () => number,
): void {
  const features = visibleFeatures(traits, stage);
  const { center, bodyTop, bodyBottom, maxHalf } = bounds;

  if (features.ears) {
    const earSpread = Math.max(2, maxHalf - 1);
    set(grid, bodyTop - 1, center - earSpread, "b");
    set(grid, bodyTop - 1, center + earSpread, "b");
    set(grid, bodyTop, center - earSpread, "d");
    set(grid, bodyTop, center + earSpread, "d");
  }

  if (features.horns) {
    set(grid, bodyTop - 1, center - 1, "a");
    set(grid, bodyTop - 1, center + 1, "a");
    set(grid, bodyTop - 2, center - 1, "a");
    set(grid, bodyTop - 2, center + 1, "a");
  }

  if (features.wings) {
    const wingRow = Math.round((bodyTop + bodyBottom) / 2);
    const wingCol = maxHalf + 1;
    set(grid, wingRow, center - wingCol, "a");
    set(grid, wingRow, center + wingCol, "a");
    set(grid, wingRow - 1, center - wingCol, "a");
    set(grid, wingRow - 1, center + wingCol, "a");
    set(grid, wingRow + 1, center - wingCol, "a");
    set(grid, wingRow + 1, center + wingCol, "a");
  }

  if (features.spots) {
    // A few deterministic, symmetric accent spots on the lower body.
    const spotCount = 2 + Math.floor(spotRng() * 2);
    for (let i = 0; i < spotCount; i += 1) {
      const r = bodyTop + 2 + Math.floor(spotRng() * Math.max(1, bodyBottom - bodyTop - 2));
      const o = 1 + Math.floor(spotRng() * Math.max(1, maxHalf - 1));
      if (get(grid, r, center - o) === "s" || get(grid, r, center - o) === "b") {
        set(grid, r, center - o, "a");
      }
      if (get(grid, r, center + o) === "s" || get(grid, r, center + o) === "b") {
        set(grid, r, center + o, "a");
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Generate the pixel art for a creature at a given life stage. Pure: identical
 * (genome, stage) inputs always return identical art, which is what lets the
 * same pet redraw consistently and makes the output trivially testable.
 */
export function generateSprite(genome: Genome, stage: Stage): Sprite {
  const traits = decodeTraits(genome);
  const palette = buildPalette(traits);
  const { width, height } = dimsForStage(stage);
  const grid = blankGrid(width, height);

  if (stage === "egg") {
    drawEgg(grid);
    return { palette, pixels: toRows(grid) };
  }

  const jitterRng = rngFor(genome, `jitter:${stage}`);
  const spotRng = rngFor(genome, `spots:${stage}`);

  const bounds = drawBody(grid, traits, jitterRng);
  applyShading(grid, bounds);
  // Outline the body silhouette first, then lay features and eyes on top so
  // small features (ears) keep their fill instead of being swallowed by outline.
  applyOutline(grid);
  drawFeatures(grid, traits, stage, bounds, spotRng);
  drawEyes(grid, traits, bounds);

  return { palette, pixels: toRows(grid) };
}
