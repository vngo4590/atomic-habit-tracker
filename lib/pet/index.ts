/**
 * index.ts — public barrel for the procedural pet engine.
 *
 * The pet engine is split into focused, pure modules:
 *   - genome.ts     : seeded PRNG, temperaments, trait decoding (a pet's "DNA").
 *   - evolution.ts  : life-stage ladder and which features each stage reveals.
 *   - sprite.ts     : deterministic pixel-art generation from genome + stage.
 *   - simulation.ts : real-time satiety/health decay and permanent death.
 *   - mood.ts       : maps vitals to an emotional state + idle animation.
 *
 * UI and data layers should import from "@/lib/pet" (this barrel) rather than
 * reaching into individual files, so the internal split can evolve freely.
 */

export * from "./genome";
export * from "./evolution";
export * from "./sprite";
export * from "./simulation";
export * from "./mood";

import { decodeTraits, type Genome } from "./genome";
import {
  feedsUntilNextStage,
  stageForFeeds,
  stageLabel,
  type Stage,
} from "./evolution";
import { generateSprite, type Sprite } from "./sprite";
import { deriveMood, type Mood, type MoodContext } from "./mood";
import {
  healthRatio,
  satietyRatio,
  simulatePet,
  tuningFor,
  type PetVitals,
} from "./simulation";

/**
 * The persisted, storage-agnostic shape of a pet. The repository maps a database
 * row into this; the store/UI consume it. Appearance is NOT stored — only the
 * genome — because the sprite is always regenerated deterministically.
 */
export interface PetRecord {
  /** Stable id (database primary key). */
  id: string;
  /** The user-given display name. */
  name: string;
  /** The genome (seed + temperament) from which the look is regenerated. */
  genome: Genome;
  /** Lifetime feeds, which drives evolution stage. */
  totalFeeds: number;
  /** Time-varying vital signs advanced by the simulation. */
  vitals: PetVitals;
}

/**
 * A fully-derived, render-ready view of a pet at a moment in time. This is the
 * single object the UI needs: it bundles the simulated vitals, the current life
 * stage, the generated sprite, and the resolved mood. Pure and memoisable.
 */
export interface PetView {
  id: string;
  name: string;
  genome: Genome;
  /** Vitals simulated forward to `now`. */
  vitals: PetVitals;
  totalFeeds: number;
  stage: Stage;
  stageLabel: string;
  /** Feeds remaining until the next evolution, or null at the final stage. */
  feedsUntilNextStage: number | null;
  sprite: Sprite;
  mood: Mood;
  /** Satiety as a 0..1 bar ratio. */
  satietyRatio: number;
  /** Health as a 0..1 bar ratio. */
  healthRatio: number;
}

/**
 * Build the complete, render-ready view of a pet: simulate its vitals up to
 * `now`, work out its life stage, generate its sprite, and resolve its mood.
 * Keeping this pure means both the server and the live client UI derive the pet
 * identically from the same stored record.
 */
export function buildPetView(record: PetRecord, ctx: MoodContext): PetView {
  const vitals = simulatePet(record.vitals, tuningFor(record.genome.temperament), ctx.now);
  const stage = stageForFeeds(record.totalFeeds);
  const sprite = generateSprite(record.genome, stage);
  const mood = deriveMood(vitals, ctx);

  return {
    id: record.id,
    name: record.name,
    genome: record.genome,
    vitals,
    totalFeeds: record.totalFeeds,
    stage,
    stageLabel: stageLabel(stage),
    feedsUntilNextStage: feedsUntilNextStage(record.totalFeeds),
    sprite,
    mood,
    satietyRatio: satietyRatio(vitals.satiety),
    healthRatio: healthRatio(vitals.health),
  };
}

/** Re-export trait decoding for previews (e.g. the adopt panel) at call sites. */
export { decodeTraits };
