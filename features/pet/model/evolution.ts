/**
 * evolution.ts — how a pet grows up over its lifetime.
 *
 * Plain-language summary:
 *   A pet is not born as its final form. It starts as an egg and, as the user
 *   keeps it fed (each feed comes from a completed habit), it evolves through a
 *   ladder of life stages. Crucially, evolution is NOT a swap to a different
 *   creature: the early traits (colour family, silhouette, eyes) stay the same,
 *   while later stages *unlock* new seed-derived features (ears, horns, wings,
 *   patterns). So the pet always feels like the same individual growing up, but
 *   exactly which surprises it reveals depends on its unique genome.
 *
 * This module owns only the stage ladder and the thresholds that move a pet from
 * one stage to the next. The actual drawing lives in sprite.ts, which reads the
 * current stage to decide which features to show.
 */

import type { Traits } from "./genome";

/** The ordered life stages a pet passes through. */
export type Stage = "egg" | "hatchling" | "juvenile" | "adult" | "elder";

/** The stage ladder in order, youngest first. */
export const STAGES: readonly Stage[] = [
  "egg",
  "hatchling",
  "juvenile",
  "adult",
  "elder",
] as const;

/**
 * How many *lifetime feeds* a pet needs to reach each stage. A pet earns feeds
 * by the user completing habits and choosing to feed it, so progression is a
 * direct reward for real-world consistency.
 *
 * Index lines up with STAGES: egg at 0 feeds, hatchling at 1, etc.
 */
export const STAGE_FEED_THRESHOLDS: readonly number[] = [0, 1, 8, 20, 45];

/**
 * Decide which stage a pet is at from its lifetime feed count. We walk the
 * thresholds from highest to lowest and return the first one reached, so the
 * stage only ever moves forward as feeds accumulate.
 */
export function stageForFeeds(totalFeeds: number): Stage {
  for (let i = STAGES.length - 1; i >= 0; i -= 1) {
    if (totalFeeds >= STAGE_FEED_THRESHOLDS[i]) {
      return STAGES[i];
    }
  }
  return "egg";
}

/** Zero-based index of a stage in the ladder (egg = 0 … elder = 4). */
export function stageIndex(stage: Stage): number {
  const index = STAGES.indexOf(stage);
  return index < 0 ? 0 : index;
}

/**
 * The next stage up, or null if the pet is already at the final (elder) stage.
 * Used to show "X more feeds until it evolves" hints in the UI.
 */
export function nextStage(stage: Stage): Stage | null {
  const index = stageIndex(stage);
  return index < STAGES.length - 1 ? STAGES[index + 1] : null;
}

/**
 * Feeds still required before the pet evolves again, or null at the final stage.
 * Lets the UI render an encouraging "2 feeds to grow!" progress hint.
 */
export function feedsUntilNextStage(totalFeeds: number): number | null {
  const current = stageForFeeds(totalFeeds);
  const upcoming = nextStage(current);
  if (!upcoming) {
    return null;
  }
  return Math.max(0, STAGE_FEED_THRESHOLDS[stageIndex(upcoming)] - totalFeeds);
}

/**
 * Whether crossing from `before` feeds to `after` feeds triggers an evolution.
 * The feed action uses this to know when to celebrate a stage-up in the UI.
 */
export function didEvolve(beforeFeeds: number, afterFeeds: number): boolean {
  return stageForFeeds(beforeFeeds) !== stageForFeeds(afterFeeds);
}

/**
 * Which optional features are *visible* at a given stage. This is the heart of
 * the "lineage + surprise" idea: a trait the genome enabled only appears once
 * the pet is old enough, so each evolution can reveal something new while the
 * base creature stays recognisably itself.
 */
export interface VisibleFeatures {
  ears: boolean;
  horns: boolean;
  wings: boolean;
  spots: boolean;
}

/** Resolve the features actually shown for a creature at a given life stage. */
export function visibleFeatures(traits: Traits, stage: Stage): VisibleFeatures {
  const index = stageIndex(stage);
  return {
    // Ears emerge once the egg hatches.
    ears: traits.hasEars && index >= stageIndex("hatchling"),
    // Horns sprout in the juvenile growth spurt.
    horns: traits.hasHorns && index >= stageIndex("juvenile"),
    // Wings and patterns are adult/elder reveals — the biggest surprises.
    wings: traits.hasWings && index >= stageIndex("adult"),
    spots: traits.hasSpots && index >= stageIndex("adult"),
  };
}

/** A friendly, capitalised label for a stage (for badges and toasts). */
export function stageLabel(stage: Stage): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}
