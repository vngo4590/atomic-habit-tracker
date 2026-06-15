import { describe, expect, it } from "vitest";

import {
  BASE_DECAY_PER_HOUR,
  feedVitals,
  initialVitals,
  MAX_SATIETY,
  simulatePet,
  tuningFor,
  type PetVitals,
  type SimTuning,
} from "@/lib/pet/simulation";

/**
 * The simulation is where the stakes live: time passes, the pet gets hungry, and
 * if neglected it dies permanently. These tests verify the decay -> starvation ->
 * death pipeline and that the maths is deterministic and idempotent.
 */
describe("simulation", () => {
  const HOUR = 3_600_000;
  const neutral: SimTuning = { metabolism: 1, resilience: 1 };
  const t0 = 1_000_000_000_000; // a fixed epoch baseline for reproducible tests

  function vitals(overrides: Partial<PetVitals> = {}): PetVitals {
    return {
      satiety: MAX_SATIETY,
      health: 100,
      lastSimAt: t0,
      lastFedAt: t0,
      bornAt: t0,
      isAlive: true,
      diedAt: null,
      ...overrides,
    };
  }

  describe("satiety decay", () => {
    it("reduces satiety at the base rate over time", () => {
      // Given a full pet; When two hours pass
      const next = simulatePet(vitals({ satiety: 8 }), neutral, t0 + 2 * HOUR);

      // Then satiety dropped by base rate * 2 hours
      expect(next.satiety).toBeCloseTo(8 - BASE_DECAY_PER_HOUR * 2, 5);
      expect(next.isAlive).toBe(true);
    });

    it("metabolism makes a pet get hungry faster", () => {
      // Given identical pets with different metabolisms
      const slow = simulatePet(vitals({ satiety: 8 }), { metabolism: 0.8, resilience: 1 }, t0 + 3 * HOUR);
      const fast = simulatePet(vitals({ satiety: 8 }), { metabolism: 1.3, resilience: 1 }, t0 + 3 * HOUR);

      // When three hours pass; Then the faster metaboliser is hungrier
      expect(fast.satiety).toBeLessThan(slow.satiety);
    });
  });

  describe("starvation drains health only after satiety hits zero", () => {
    it("does not touch health while there is still food", () => {
      // Given a pet with some food; When a short time passes
      const next = simulatePet(vitals({ satiety: 8, health: 80 }), neutral, t0 + 1 * HOUR);

      // Then health did not fall (it regenerated, capped at 100)
      expect(next.health).toBeGreaterThanOrEqual(80);
    });

    it("drains health once the belly is empty", () => {
      // Given a nearly-empty pet (satiety 1 -> empties in ~1.67h at rate 0.6)
      // When a long time passes
      const next = simulatePet(vitals({ satiety: 1, health: 100 }), neutral, t0 + 12 * HOUR);

      // Then satiety bottomed out and health has clearly dropped
      expect(next.satiety).toBe(0);
      expect(next.health).toBeLessThan(100);
      expect(next.isAlive).toBe(true);
    });
  });

  describe("permanent death", () => {
    it("dies when sustained starvation exhausts health", () => {
      // Given an empty, low-health pet; When a long neglect period passes
      const next = simulatePet(vitals({ satiety: 0, health: 10 }), neutral, t0 + 100 * HOUR);

      // Then the pet is dead, health pinned to 0, with a recorded death time
      expect(next.isAlive).toBe(false);
      expect(next.health).toBe(0);
      expect(next.diedAt).not.toBeNull();
      expect(next.diedAt!).toBeGreaterThan(t0);
    });

    it("freezes a dead pet on further simulation (no resurrection)", () => {
      // Given an already-dead pet
      const dead = simulatePet(vitals({ satiety: 0, health: 1 }), neutral, t0 + 200 * HOUR);
      expect(dead.isAlive).toBe(false);

      // When we simulate again far into the future; Then nothing changes
      const later = simulatePet(dead, neutral, t0 + 10_000 * HOUR);
      expect(later).toEqual(dead);
    });

    it("resilience lets a hardier pet survive longer", () => {
      // Given identical neglect on a fragile vs hardy pet
      const fragile = simulatePet(vitals({ satiety: 0, health: 40 }), { metabolism: 1, resilience: 0.7 }, t0 + 8 * HOUR);
      const hardy = simulatePet(vitals({ satiety: 0, health: 40 }), { metabolism: 1, resilience: 1.3 }, t0 + 8 * HOUR);

      // When the same time passes; Then the hardy pet retains more health
      expect(hardy.health).toBeGreaterThan(fragile.health);
    });
  });

  describe("idempotency", () => {
    it("yields the same result whether simulated in one or two steps", () => {
      // Given a starting pet
      const start = vitals({ satiety: 5, health: 90 });

      // When simulated straight to t0+6h vs via an intermediate checkpoint
      const direct = simulatePet(start, neutral, t0 + 6 * HOUR);
      const stepwise = simulatePet(simulatePet(start, neutral, t0 + 3 * HOUR), neutral, t0 + 6 * HOUR);

      // Then both paths agree (to floating-point tolerance)
      expect(stepwise.satiety).toBeCloseTo(direct.satiety, 5);
      expect(stepwise.health).toBeCloseTo(direct.health, 5);
    });

    it("does not run time backwards", () => {
      // Given a checkpoint; When asked to simulate to an earlier time
      const start = vitals();
      const next = simulatePet(start, neutral, t0 - HOUR);

      // Then the vitals are returned unchanged
      expect(next).toEqual(start);
    });
  });

  describe("feedVitals", () => {
    it("tops up satiety, capped at the maximum", () => {
      // Given a half-full pet; When fed 10 units
      const fed = feedVitals(vitals({ satiety: 3 }), 10, t0 + HOUR);

      // Then satiety caps at MAX and lastFedAt advances
      expect(fed.satiety).toBe(MAX_SATIETY);
      expect(fed.lastFedAt).toBe(t0 + HOUR);
    });

    it("refuses to feed a dead pet", () => {
      // Given a dead pet; When fed; Then nothing changes
      const dead = vitals({ isAlive: false, diedAt: t0, health: 0, satiety: 0 });
      expect(feedVitals(dead, 5, t0 + HOUR)).toEqual(dead);
    });
  });

  describe("tuningFor & initialVitals", () => {
    it("derives tuning from a temperament id", () => {
      // Given the fiery temperament; Then it is a fast, fragile metaboliser
      const fiery = tuningFor("fiery");
      expect(fiery.metabolism).toBeGreaterThan(1);
      expect(fiery.resilience).toBeLessThan(1);
    });

    it("starts a new pet alive with partial food and full health", () => {
      // Given a fresh adoption at t0
      const fresh = initialVitals(t0);

      // Then it is alive, half-fed, fully healthy
      expect(fresh.isAlive).toBe(true);
      expect(fresh.health).toBe(100);
      expect(fresh.satiety).toBeGreaterThan(0);
      expect(fresh.satiety).toBeLessThanOrEqual(MAX_SATIETY);
    });
  });
});
