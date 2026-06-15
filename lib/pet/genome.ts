/**
 * genome.ts — the deterministic "DNA" of a procedurally generated pet.
 *
 * Plain-language summary:
 *   Instead of shipping a fixed roster of hand-drawn creatures, every pet is
 *   grown from two tiny numbers: a random `seed` and the `temperament` the user
 *   picked when adopting. From those, and nothing else, we can always rebuild the
 *   exact same creature — its colours, its body shape, its personality quirks —
 *   so two players who both pick "Fiery" still get visibly different pets, and a
 *   pet always looks the same every time it is loaded.
 *
 * Why this matters:
 *   - No hardcoded pets: the look is a pure function of (seed, temperament).
 *   - Surprise + lineage: higher life stages reveal new seed-derived features
 *     while keeping the early "low-order" traits stable (see evolution.ts).
 *   - Trivially testable: same input -> same output, no randomness at runtime.
 *
 * This file owns the seeded random-number generator, the temperament registry,
 * and the `Genome`/`Traits` types. Everything here is pure and synchronous.
 */

/** The personalities a user can choose at adoption. A union so UI/data can't drift. */
export type TemperamentId =
  | "calm"
  | "fiery"
  | "playful"
  | "curious"
  | "gentle"
  | "bold";

/**
 * A temperament biases both how a pet *looks* (its base colour band) and how it
 * *behaves* in the simulation (how fast it gets hungry, how hardy it is). These
 * are gentle nudges, not rigid rules — the seed still varies every creature.
 */
export interface Temperament {
  /** Stable id used for storage and lookups. */
  id: TemperamentId;
  /** Friendly display name shown on the adopt panel. */
  name: string;
  /** A short, encouraging description of the personality archetype. */
  blurb: string;
  /** Base hue band [min, max] in degrees (0-360) the body colour is drawn from. */
  hueRange: [number, number];
  /**
   * Metabolism multiplier on satiety decay. >1 means the pet gets hungry faster
   * (more demanding companion); <1 means it coasts longer between feeds.
   */
  metabolism: number;
  /**
   * Resilience multiplier that softens health loss while starving. >1 means the
   * pet clings to life longer when neglected; <1 means it is more fragile.
   */
  resilience: number;
}

/** The adoptable temperaments. Hue bands are spread around the wheel so the */
/* six personalities read as clearly different colour families at a glance.   */
export const TEMPERAMENTS: readonly Temperament[] = [
  {
    id: "calm",
    name: "Calm",
    blurb: "A serene soul that ambles through the day and rarely frets.",
    hueRange: [180, 215], // cool teal-blue
    metabolism: 0.8,
    resilience: 1.25,
  },
  {
    id: "fiery",
    name: "Fiery",
    blurb: "A spark of pure energy that burns bright and needs feeding often.",
    hueRange: [5, 35], // red-orange
    metabolism: 1.3,
    resilience: 0.85,
  },
  {
    id: "playful",
    name: "Playful",
    blurb: "A bouncy goofball that turns every win into a celebration.",
    hueRange: [280, 320], // magenta-violet
    metabolism: 1.1,
    resilience: 1.0,
  },
  {
    id: "curious",
    name: "Curious",
    blurb: "A bright-eyed explorer always poking at something new.",
    hueRange: [45, 70], // warm yellow
    metabolism: 1.0,
    resilience: 1.0,
  },
  {
    id: "gentle",
    name: "Gentle",
    blurb: "A tender, easygoing friend that forgives a missed day or two.",
    hueRange: [120, 155], // soft green
    metabolism: 0.85,
    resilience: 1.2,
  },
  {
    id: "bold",
    name: "Bold",
    blurb: "A fearless adventurer with a strong constitution and big presence.",
    hueRange: [220, 255], // deep blue-indigo
    metabolism: 1.05,
    resilience: 1.1,
  },
] as const;

/** Fast id -> temperament lookup so resolving a stored choice stays O(1). */
const TEMPERAMENT_BY_ID = new Map<TemperamentId, Temperament>(
  TEMPERAMENTS.map((temperament) => [temperament.id, temperament]),
);

/** Narrowing guard: is this arbitrary value one of our known temperament ids? */
export function isTemperamentId(value: unknown): value is TemperamentId {
  return typeof value === "string" && TEMPERAMENT_BY_ID.has(value as TemperamentId);
}

/** Resolve a temperament id, falling back to "calm" for unknown/missing values. */
export function getTemperament(id: string | null | undefined): Temperament {
  if (isTemperamentId(id)) {
    return TEMPERAMENT_BY_ID.get(id)!;
  }
  return TEMPERAMENT_BY_ID.get("calm")!;
}

/**
 * The full genetic identity of a pet. This is all we persist about its
 * appearance — everything visual is regenerated from these two fields.
 */
export interface Genome {
  /** A 32-bit unsigned integer that seeds the deterministic creature build. */
  seed: number;
  /** The temperament chosen at adoption. */
  temperament: TemperamentId;
}

/* -------------------------------------------------------------------------- */
/* Seeded pseudo-random number generation                                      */
/* -------------------------------------------------------------------------- */

/**
 * mulberry32: a tiny, fast, well-distributed seeded PRNG. Given the same 32-bit
 * seed it always produces the same stream of numbers in [0, 1). We use it so a
 * pet's look is reproducible from its seed alone — no Math.random() anywhere.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mix a base seed with a string "salt" to get a fresh, independent 32-bit seed.
 * This lets one genome spawn several *independent* random streams (one for body
 * shape, one for colour, one for features…) that never accidentally correlate.
 */
export function deriveSeed(seed: number, salt: string): number {
  let h = seed >>> 0;
  for (let i = 0; i < salt.length; i += 1) {
    h = Math.imul(h ^ salt.charCodeAt(i), 0x01000193);
  }
  return h >>> 0;
}

/** Convenience: build a named PRNG stream for a genome (e.g. "body", "color"). */
export function rngFor(genome: Genome, stream: string): () => number {
  return mulberry32(deriveSeed(genome.seed, `${genome.temperament}:${stream}`));
}

/** Random integer in [min, max] inclusive, drawn from the given PRNG. */
export function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Random float in [min, max), drawn from the given PRNG. */
export function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Generate a fresh random 32-bit seed for a brand-new adoption. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/* -------------------------------------------------------------------------- */
/* Traits: the stable, decoded characteristics of a creature                   */
/* -------------------------------------------------------------------------- */

/** The shape families a pet body can take. Derived from the genome, stays fixed. */
export type BodyShape = "round" | "tall" | "wide" | "teardrop";

/** The eye styles a pet can have. */
export type EyeStyle = "dot" | "wide" | "sleepy" | "sparkle";

/**
 * Decoded, human-meaningful traits for a creature. These are derived once from
 * the genome and are STABLE across life stages (the "lineage" the user keeps),
 * except for the feature flags which are *unlocked* progressively by stage to
 * create the surprise-reveal during evolution (see evolution.ts / sprite.ts).
 */
export interface Traits {
  /** Base body hue in degrees (0-360), inside the temperament's band. */
  hue: number;
  /** Accent hue (for horns/spots/belly) offset from the base hue. */
  accentHue: number;
  /** Body silhouette family. */
  bodyShape: BodyShape;
  /** Eye rendering style. */
  eyeStyle: EyeStyle;
  /** Whether this lineage *can* grow horns (revealed at juvenile+). */
  hasHorns: boolean;
  /** Whether this lineage *can* grow ears (revealed at hatchling+). */
  hasEars: boolean;
  /** Whether this lineage *can* grow wings (revealed at adult+). */
  hasWings: boolean;
  /** Whether this lineage *can* show belly/spot patterns (revealed at adult+). */
  hasSpots: boolean;
  /** A subtle 0..1 "plumpness" used to vary the body profile. */
  plumpness: number;
}

/**
 * Decode a genome into its stable traits. Reading the streams in a FIXED order
 * is what guarantees lineage: the first values drawn (hue, shape, eyes) never
 * change as the pet ages, so the creature always feels like "the same pet".
 */
export function decodeTraits(genome: Genome): Traits {
  const temperament = getTemperament(genome.temperament);

  const colorRng = rngFor(genome, "color");
  const shapeRng = rngFor(genome, "shape");
  const featureRng = rngFor(genome, "feature");

  const [hueMin, hueMax] = temperament.hueRange;
  const hue = Math.round(randRange(colorRng, hueMin, hueMax));
  // Accent sits a little way around the wheel for tasteful contrast.
  const accentHue = (hue + randInt(colorRng, 25, 60)) % 360;

  const bodyShapes: BodyShape[] = ["round", "tall", "wide", "teardrop"];
  const eyeStyles: EyeStyle[] = ["dot", "wide", "sleepy", "sparkle"];
  const bodyShape = bodyShapes[randInt(shapeRng, 0, bodyShapes.length - 1)];
  const eyeStyle = eyeStyles[randInt(shapeRng, 0, eyeStyles.length - 1)];
  const plumpness = randRange(shapeRng, 0.2, 0.9);

  return {
    hue,
    accentHue,
    bodyShape,
    eyeStyle,
    hasHorns: featureRng() > 0.55,
    hasEars: featureRng() > 0.4,
    hasWings: featureRng() > 0.65,
    hasSpots: featureRng() > 0.5,
    plumpness,
  };
}
