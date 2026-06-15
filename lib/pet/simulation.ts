/**
 * simulation.ts — the living clock that makes a pet hungry, sick, or gone.
 *
 * Plain-language summary:
 *   A pet does not just sit still between visits. Real time passes, and as it
 *   does the pet slowly gets hungry (satiety falls). If it runs out of food and
 *   stays starving, its health starts to drain — and if health hits zero, the
 *   pet dies, permanently. This is what gives raising a pet real stakes: neglect
 *   has consequences. Feeding (earned by completing habits) tops the pet back up.
 *
 * Why it is written this way:
 *   - It is a PURE function of (current vitals, tuning, "now"). No clocks, no I/O.
 *     The caller passes the current time, which makes every outcome reproducible
 *     and unit-testable, and lets us run the exact same maths on the server (the
 *     source of truth) and on the client (for smooth live ticking).
 *   - It is *idempotent over a checkpoint*: each result carries `lastSimAt`, so
 *     simulating again from the new state only advances by the new elapsed time.
 */

import { getTemperament, type TemperamentId } from "./genome";

/** Maximum satiety a pet can hold. Feeds beyond this are simply capped. */
export const MAX_SATIETY = 8;

/** Maximum (and starting) health. Health only drains through starvation. */
export const MAX_HEALTH = 100;

/** Base satiety lost per hour at metabolism 1.0 (≈ full -> empty in ~13h). */
export const BASE_DECAY_PER_HOUR = 0.6;

/** Health lost per hour of continuous starvation at resilience 1.0. */
export const HEALTH_DRAIN_PER_HOUR = 4;

/** Health recovered per hour while the pet still has food in its belly. */
export const HEALTH_REGEN_PER_HOUR = 1.5;

/** One hour in milliseconds — the unit our rates are expressed in. */
const HOUR_MS = 3_600_000;

/** Clamp a number into the inclusive [min, max] range. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * The time-varying "vital signs" of a pet. These are persisted and advanced by
 * the simulation; the genome (look) and temperament (tuning) live elsewhere.
 */
export interface PetVitals {
  /** Current fullness, 0..MAX_SATIETY. */
  satiety: number;
  /** Current health, 0..MAX_HEALTH. Reaches 0 only via sustained starvation. */
  health: number;
  /** Epoch ms of the last simulation checkpoint (where satiety/health are exact). */
  lastSimAt: number;
  /** Epoch ms the pet was most recently fed (drives the "excited" mood). */
  lastFedAt: number;
  /** Epoch ms the pet was born/adopted (drives age-based hints). */
  bornAt: number;
  /** False once the pet has died; death is permanent. */
  isAlive: boolean;
  /** Epoch ms of death, or null while alive. */
  diedAt: number | null;
}

/** Behavioural tuning derived from a pet's temperament. */
export interface SimTuning {
  /** Multiplier on satiety decay (>1 = hungrier). */
  metabolism: number;
  /** Multiplier softening health loss while starving (>1 = hardier). */
  resilience: number;
}

/** Look up the simulation tuning for a temperament id. */
export function tuningFor(temperament: TemperamentId | string): SimTuning {
  const t = getTemperament(temperament);
  return { metabolism: t.metabolism, resilience: t.resilience };
}

/** A brand-new, fully-fed-ish set of vitals for a freshly adopted pet. */
export function initialVitals(now: number): PetVitals {
  return {
    // A new pet starts with a little food so it is not immediately hungry.
    satiety: Math.round(MAX_SATIETY / 2),
    health: MAX_HEALTH,
    lastSimAt: now,
    lastFedAt: now,
    bornAt: now,
    isAlive: true,
    diedAt: null,
  };
}

/**
 * Advance a pet's vitals from its last checkpoint up to `now`.
 *
 * The maths in three sentences:
 *   1. Satiety falls at a steady rate until it hits zero.
 *   2. Only *after* satiety is empty does starvation begin draining health.
 *   3. If health would cross zero, we pin death to the exact moment it did and
 *      freeze the pet there (no zombie state, no further change).
 */
export function simulatePet(vitals: PetVitals, tuning: SimTuning, now: number): PetVitals {
  // Dead pets are frozen forever, and we never run time backwards (clock skew).
  if (!vitals.isAlive || now <= vitals.lastSimAt) {
    return vitals;
  }

  const elapsedH = (now - vitals.lastSimAt) / HOUR_MS;
  const decayRate = BASE_DECAY_PER_HOUR * tuning.metabolism;
  const drainRate = HEALTH_DRAIN_PER_HOUR / tuning.resilience;

  // Hours of food left before satiety reaches zero.
  const timeToEmptyH = decayRate > 0 ? vitals.satiety / decayRate : Infinity;

  if (elapsedH <= timeToEmptyH) {
    // Still fed for the whole interval: satiety drops, health gently recovers.
    return {
      ...vitals,
      satiety: clamp(vitals.satiety - decayRate * elapsedH, 0, MAX_SATIETY),
      health: clamp(vitals.health + HEALTH_REGEN_PER_HOUR * elapsedH, 0, MAX_HEALTH),
      lastSimAt: now,
    };
  }

  // Past the point of emptiness: the pet has been starving for `starvingH` hours.
  const starvingH = elapsedH - timeToEmptyH;
  const healthLoss = drainRate * starvingH;

  if (vitals.health - healthLoss <= 0) {
    // Death: compute the precise hour health crossed zero and freeze there.
    const hoursToDeath = timeToEmptyH + (drainRate > 0 ? vitals.health / drainRate : Infinity);
    const diedAt = vitals.lastSimAt + hoursToDeath * HOUR_MS;
    return {
      ...vitals,
      satiety: 0,
      health: 0,
      isAlive: false,
      diedAt,
      lastSimAt: diedAt,
    };
  }

  return {
    ...vitals,
    satiety: 0,
    health: clamp(vitals.health - healthLoss, 0, MAX_HEALTH),
    lastSimAt: now,
  };
}

/**
 * Feed a pet `amount` units at time `now`, returning the new vitals. Callers
 * should simulate up to `now` first so the feed lands on current values. Feeding
 * a dead pet does nothing — the dead stay dead.
 */
export function feedVitals(vitals: PetVitals, amount: number, now: number): PetVitals {
  if (!vitals.isAlive || amount <= 0) {
    return vitals;
  }
  return {
    ...vitals,
    satiety: clamp(vitals.satiety + amount, 0, MAX_SATIETY),
    lastFedAt: now,
    lastSimAt: now,
  };
}

/** Satiety expressed as a 0..1 ratio for rendering the fullness bar. */
export function satietyRatio(satiety: number): number {
  return clamp(satiety, 0, MAX_SATIETY) / MAX_SATIETY;
}

/** Health expressed as a 0..1 ratio for rendering the health bar. */
export function healthRatio(health: number): number {
  return clamp(health, 0, MAX_HEALTH) / MAX_HEALTH;
}

/** Remaining satiety capacity right now (how many more units it can take). */
export function satietyCapacity(satiety: number): number {
  return Math.max(0, MAX_SATIETY - Math.ceil(clamp(satiety, 0, MAX_SATIETY)));
}
