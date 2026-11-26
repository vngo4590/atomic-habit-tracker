/**
 * mood.ts — translates a pet's vital signs into an emotional state + animation.
 *
 * Plain-language summary:
 *   The numbers from the simulation (satiety, health, time since fed) are not
 *   very expressive on their own. This module turns them into a single, friendly
 *   *mood* — hungry, sleeping, happy, in love, and so on — which the UI uses to
 *   pick an idle animation and a caption. It is the pet's "face".
 *
 * Pure and deterministic: the same vitals + clock yield the same mood, so it is
 * easy to test and behaves identically on server and client.
 */

import {
  MAX_HEALTH,
  MAX_SATIETY,
  type PetVitals,
} from "./simulation";

/** Every emotional state a pet can be in. Drives caption + idle animation. */
export type MoodId =
  | "dead"
  | "sick"
  | "hungry"
  | "sleeping"
  | "content"
  | "happy"
  | "excited"
  | "inLove";

/** The animation families the <MoodSprite> knows how to play. */
export type MoodAnimation =
  | "none"
  | "shiver"
  | "slump"
  | "bob"
  | "sway"
  | "bounce"
  | "jump"
  | "float";

/** A resolved mood: its id, a friendly caption, a face, and its idle animation. */
export interface Mood {
  id: MoodId;
  /** Short caption shown under the pet (e.g. "Famished"). */
  label: string;
  /** A tiny emoticon face for accessibility/flavour. */
  face: string;
  /** Which idle animation the sprite should loop. */
  animation: MoodAnimation;
}

/** The lookup table of mood presentation, keyed by mood id. */
const MOODS: Record<MoodId, Mood> = {
  dead: { id: "dead", label: "Gone", face: "( x _ x )", animation: "none" },
  sick: { id: "sick", label: "Unwell", face: "( u _ u )", animation: "shiver" },
  hungry: { id: "hungry", label: "Famished", face: "( ; o ; )", animation: "slump" },
  sleeping: { id: "sleeping", label: "Sleeping", face: "( - _ - ) z", animation: "sway" },
  content: { id: "content", label: "Content", face: "( ^ _ ^ )", animation: "bob" },
  happy: { id: "happy", label: "Happy", face: "( ^ w ^ )", animation: "bounce" },
  excited: { id: "excited", label: "Excited!", face: "( ! o ! )", animation: "jump" },
  inLove: { id: "inLove", label: "In love", face: "( ♥ w ♥ )", animation: "float" },
};

/** Resolve a mood id to its presentation (caption, face, animation). */
export function moodById(id: MoodId): Mood {
  return MOODS[id];
}

/** Options that nudge mood beyond raw vitals (mainly the local hour for sleep). */
export interface MoodContext {
  /** Current epoch ms (defines "just fed" recency). */
  now: number;
  /** Local hour 0-23; pets prefer to sleep at night when idle. */
  hour: number;
}

/** A feed within this window counts as "just fed" and sparks excitement. */
const JUST_FED_MS = 90_000;

/** Health at or below this fraction of max reads as visibly unwell. */
const SICK_HEALTH_RATIO = 0.3;

/**
 * Derive a pet's current mood from its vitals and context.
 *
 * Priority order (most urgent / most expressive first):
 *   dead -> sick -> excited(just fed) -> inLove(thriving) -> hungry ->
 *   sleeping(night & idle) -> happy -> content.
 */
export function deriveMood(vitals: PetVitals, ctx: MoodContext): Mood {
  if (!vitals.isAlive) {
    return MOODS.dead;
  }

  const satietyRatio = vitals.satiety / MAX_SATIETY;
  const healthRatio = vitals.health / MAX_HEALTH;
  const justFed = ctx.now - vitals.lastFedAt <= JUST_FED_MS;
  const isNight = ctx.hour >= 22 || ctx.hour < 6;

  // Low health dominates: a sick pet looks sick whatever else is true.
  if (healthRatio <= SICK_HEALTH_RATIO) {
    return MOODS.sick;
  }

  // A fresh feed is always a moment of joy.
  if (justFed && satietyRatio > 0.25) {
    return MOODS.excited;
  }

  // Thriving: full belly and full health -> blissful, lovestruck.
  if (satietyRatio >= 0.95 && healthRatio >= 0.95) {
    return MOODS.inLove;
  }

  // Empty belly -> hungry plea (but not just-fed, handled above).
  if (satietyRatio <= 0.15) {
    return MOODS.hungry;
  }

  // At night, a reasonably content pet curls up to sleep.
  if (isNight && satietyRatio > 0.3) {
    return MOODS.sleeping;
  }

  // Plenty of food -> happy; otherwise simply content.
  if (satietyRatio >= 0.6) {
    return MOODS.happy;
  }

  return MOODS.content;
}
