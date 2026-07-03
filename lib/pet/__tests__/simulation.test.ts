import { describe, expect, it } from "vitest";

import {
  feedVitals,
  HEALTH_DRAIN_PER_DAY,
  initialVitals,
  MAX_SATIETY,
  SATIETY_DECAY_PER_DAY,
  satietyCapacity,
  simulatePet,
  tuningFor,
  type PetVitals,
  type SimTuning,
} from "@/lib/pet/simulation";

/**
 * The simulation is where the stakes live: time passes, the pet gets hungry, and
 * if neglected it dies permanently. The model is a per-DAY one — tuned so that a
 * single feed per day keeps any pet alive. These tests verify the decay ->
 * starvation -> death pipeline and that the maths is deterministic and idempotent.
 */
describe("simulation", () => {
  const DAY = 86_400_000;
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
    it("reduces satiety at the base per-day rate over time", () => {
      // Given a full pet; When two days pass
      const next = simulatePet(vitals({ satiety: MAX_SATIETY }), neutral, t0 + 2 * DAY);

      // Then satiety dropped by the base per-day rate * 2 days
      expect(next.satiety).toBeCloseTo(MAX_SATIETY - SATIETY_DECAY_PER_DAY * 2, 5);
      expect(next.isAlive).toBe(true);
    });

    it("metabolism makes a pet get hungry faster", () => {
      // Given identical pets with different metabolisms
      const slow = simulatePet(vitals({ satiety: MAX_SATIETY }), { metabolism: 0.8, resilience: 1 }, t0 + 2 * DAY);
      const fast = simulatePet(vitals({ satiety: MAX_SATIETY }), { metabolism: 1.3, resilience: 1 }, t0 + 2 * DAY);

      // When two days pass; Then the faster metaboliser is hungrier
      expect(fast.satiety).toBeLessThan(slow.satiety);
    });
  });

  describe("survival rule: one feed a day is enough", () => {
    it("keeps even the hungriest temperament alive on a single daily feed", () => {
      // Given a brand-new fiery (hungriest) pet
      const tuning = tuningFor("fiery");
      let state = initialVitals(t0);

      // When we feed it exactly one unit per day for 30 days
      for (let day = 1; day <= 30; day += 1) {
        const at = t0 + day * DAY;
        state = simulatePet(state, tuning, at);
        state = feedVitals(state, 1, at);
      }

      // Then it is comfortably alive and healthy the whole time
      expect(state.isAlive).toBe(true);
      expect(state.satiety).toBeGreaterThan(0);
      expect(state.health).toBe(100);
    });
  });

  describe("starvation drains health only after satiety hits zero", () => {
    it("does not touch health while there is still food", () => {
      // Given a pet with some food; When a short time passes
      const next = simulatePet(vitals({ satiety: MAX_SATIETY, health: 80 }), neutral, t0 + 0.5 * DAY);

      // Then health did not fall (it regenerated, capped at 100)
      expect(next.health).toBeGreaterThanOrEqual(80);
    });

    it("drains health once the belly is empty", () => {
      // Given a nearly-empty pet; When several days of neglect pass
      const next = simulatePet(vitals({ satiety: 0.5, health: 100 }), neutral, t0 + 3 * DAY);

      // Then satiety bottomed out and health has clearly dropped
      expect(next.satiety).toBe(0);
      expect(next.health).toBeLessThan(100);
      expect(next.isAlive).toBe(true);
    });
  });

  describe("permanent death", () => {
    it("dies when sustained starvation exhausts health", () => {
      // Given an empty, low-health pet; When a long neglect period passes
      const next = simulatePet(vitals({ satiety: 0, health: 10 }), neutral, t0 + 30 * DAY);

      // Then the pet is dead, health pinned to 0, with a recorded death time
      expect(next.isAlive).toBe(false);
      expect(next.health).toBe(0);
      expect(next.diedAt).not.toBeNull();
      expect(next.diedAt!).toBeGreaterThan(t0);
    });

    it("freezes a dead pet on further simulation (no resurrection)", () => {
      // Given an already-dead pet
      const dead = simulatePet(vitals({ satiety: 0, health: 1 }), neutral, t0 + 30 * DAY);
      expect(dead.isAlive).toBe(false);

      // When we simulate again far into the future; Then nothing changes
      const later = simulatePet(dead, neutral, t0 + 10_000 * DAY);
      expect(later).toEqual(dead);
    });

    it("takes about four days of empty-belly neglect to die from full health", () => {
      // Given a freshly-empty but fully-healthy pet (HEALTH_DRAIN_PER_DAY = 25)
      const empty = vitals({ satiety: 0, health: 100 });

      // When just under four days pass; Then it clings on
      const almost = simulatePet(empty, neutral, t0 + (100 / HEALTH_DRAIN_PER_DAY - 0.1) * DAY);
      expect(almost.isAlive).toBe(true);

      // When just over four days pass; Then it has died
      const gone = simulatePet(empty, neutral, t0 + (100 / HEALTH_DRAIN_PER_DAY + 0.1) * DAY);
      expect(gone.isAlive).toBe(false);
    });

    it("resilience lets a hardier pet survive longer", () => {
      // Given identical neglect on a fragile vs hardy pet
      const fragile = simulatePet(vitals({ satiety: 0, health: 40 }), { metabolism: 1, resilience: 0.7 }, t0 + 1 * DAY);
      const hardy = simulatePet(vitals({ satiety: 0, health: 40 }), { metabolism: 1, resilience: 1.3 }, t0 + 1 * DAY);

      // When the same time passes; Then the hardy pet retains more health
      expect(hardy.health).toBeGreaterThan(fragile.health);
    });
  });

  describe("idempotency", () => {
    it("yields the same result whether simulated in one or two steps", () => {
      // Given a starting pet
      const start = vitals({ satiety: 2, health: 90 });

      // When simulated straight to t0+2d vs via an intermediate checkpoint
      const direct = simulatePet(start, neutral, t0 + 2 * DAY);
      const stepwise = simulatePet(simulatePet(start, neutral, t0 + 1 * DAY), neutral, t0 + 2 * DAY);

      // Then both paths agree (to floating-point tolerance)
      expect(stepwise.satiety).toBeCloseTo(direct.satiety, 5);
      expect(stepwise.health).toBeCloseTo(direct.health, 5);
    });

    it("does not run time backwards", () => {
      // Given a checkpoint; When asked to simulate to an earlier time
      const start = vitals();
      const next = simulatePet(start, neutral, t0 - DAY);

      // Then the vitals are returned unchanged
      expect(next).toEqual(start);
    });
  });

  describe("satietyCapacity", () => {
    it("reports no room for a brimming (just-fed) pet", () => {
      // Given a pet at maximum satiety; Then it cannot take any more food
      expect(satietyCapacity(MAX_SATIETY)).toBe(0);
    });

    it("opens a feed slot after a single day of decay (the daily-feed rule)", () => {
      // Given a full pet that a real day of decay has dropped below the max...
      const afterOneDay = MAX_SATIETY - SATIETY_DECAY_PER_DAY; // ~2.3 at MAX 3

      // Then there is room for at least one feed — the bug was reporting zero
      // here (ceil rounded 2.3 back up to 3), which locked the pet as "full".
      expect(satietyCapacity(afterOneDay)).toBeGreaterThanOrEqual(1);
    });

    it("offers the full capacity to a starving pet", () => {
      // Given an empty pet; Then every satiety unit can be refilled
      expect(satietyCapacity(0)).toBe(MAX_SATIETY);
    });

    it("clamps out-of-range satiety instead of reporting negative room", () => {
      // Given absurd values; Then capacity stays within [0, MAX]
      expect(satietyCapacity(999)).toBe(0);
      expect(satietyCapacity(-5)).toBe(MAX_SATIETY);
    });
  });

  describe("feedVitals", () => {
    it("tops up satiety, capped at the maximum", () => {
      // Given a half-full pet; When fed 10 units
      const fed = feedVitals(vitals({ satiety: 1 }), 10, t0 + DAY);

      // Then satiety caps at MAX and lastFedAt advances
      expect(fed.satiety).toBe(MAX_SATIETY);
      expect(fed.lastFedAt).toBe(t0 + DAY);
    });

    it("refuses to feed a dead pet", () => {
      // Given a dead pet; When fed; Then nothing changes
      const dead = vitals({ isAlive: false, diedAt: t0, health: 0, satiety: 0 });
      expect(feedVitals(dead, 5, t0 + DAY)).toEqual(dead);
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

      // Then it is alive, partly-fed, fully healthy
      expect(fresh.isAlive).toBe(true);
      expect(fresh.health).toBe(100);
      expect(fresh.satiety).toBeGreaterThan(0);
      expect(fresh.satiety).toBeLessThanOrEqual(MAX_SATIETY);
    });
  });
});
