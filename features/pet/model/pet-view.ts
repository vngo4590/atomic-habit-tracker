/**
 * pet-view.ts - the ecosystem cap, the stored pet record shape, and the pure
 * `buildPetView` that combines every engine module into one render-ready view.
 */

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
 * The ecosystem cap: how many *alive* pets a user may keep at once. Lives in the
 * engine barrel (not the repository) so both the server-side adoption guard and
 * the client UI agree on the limit without the client importing server code.
 */
export const MAX_ALIVE_PETS = 3;

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
  /** How long the pet has been alive, in milliseconds (now - bornAt). */
  ageMs: number;
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
    ageMs: Math.max(0, ctx.now - vitals.bornAt),
  };
}

/** Re-export trait decoding for previews (e.g. the adopt panel) at call sites. */
export { decodeTraits };
