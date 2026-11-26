/**
 * Pet feature — client-safe public API (the procedural pet engine).
 *
 * The pet engine is split into focused, pure modules under `model/`:
 *   - genome.ts     : seeded PRNG, temperaments, trait decoding (a pet's "DNA").
 *   - evolution.ts  : life-stage ladder and which features each stage reveals.
 *   - sprite.ts     : deterministic pixel-art generation from genome + stage.
 *   - simulation.ts : real-time satiety/health decay and permanent death.
 *   - mood.ts       : maps vitals to an emotional state + idle animation.
 *   - pet-view.ts   : the alive cap, `PetRecord`/`PetView` and `buildPetView`.
 *
 * UI and data layers should import from "@/features/pet" (this barrel) rather than
 * reaching into individual files, so the internal split can evolve freely.
 * Database code lives behind `@/features/pet/server` and server actions behind
 * `@/features/pet/actions`.
 */

export * from "./model/genome";
export * from "./model/evolution";
export * from "./model/sprite";
export * from "./model/simulation";
export * from "./model/mood";
export * from "./model/food";
export * from "./model/age";
export * from "./model/pet-view";
export * from "./contracts";
