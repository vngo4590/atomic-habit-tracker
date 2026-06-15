import { describe, expect, it } from "vitest";

import {
  decodeTraits,
  deriveSeed,
  getTemperament,
  isTemperamentId,
  mulberry32,
  randInt,
  rngFor,
  TEMPERAMENTS,
  type Genome,
} from "@/lib/pet/genome";

/**
 * These tests pin down the determinism guarantees of the genome layer: the same
 * seed must always produce the same creature, and the temperament registry must
 * stay self-consistent. Determinism is the whole reason we can avoid hardcoded
 * pets, so it is the most important property to protect.
 */
describe("genome", () => {
  describe("mulberry32 PRNG", () => {
    it("produces a repeatable stream for a given seed", () => {
      // Given two generators created from the same seed
      const a = mulberry32(12345);
      const b = mulberry32(12345);

      // When we pull several numbers from each
      const seqA = [a(), a(), a(), a()];
      const seqB = [b(), b(), b(), b()];

      // Then the streams are identical and within [0, 1)
      expect(seqA).toEqual(seqB);
      for (const n of seqA) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(1);
      }
    });

    it("produces different streams for different seeds", () => {
      // Given generators from two different seeds
      const a = mulberry32(1);
      const b = mulberry32(2);

      // When we compare their first values; Then they differ
      expect(a()).not.toEqual(b());
    });
  });

  describe("deriveSeed", () => {
    it("is stable for the same (seed, salt) and varies by salt", () => {
      // Given a base seed
      const seed = 99;

      // When we derive named sub-seeds
      // Then the same salt is stable and different salts diverge
      expect(deriveSeed(seed, "color")).toEqual(deriveSeed(seed, "color"));
      expect(deriveSeed(seed, "color")).not.toEqual(deriveSeed(seed, "shape"));
    });
  });

  describe("randInt", () => {
    it("stays within the inclusive bounds", () => {
      // Given a seeded generator
      const rng = mulberry32(7);

      // When we draw many integers in [3, 9]
      // Then every value respects the bounds
      for (let i = 0; i < 200; i += 1) {
        const v = randInt(rng, 3, 9);
        expect(v).toBeGreaterThanOrEqual(3);
        expect(v).toBeLessThanOrEqual(9);
      }
    });
  });

  describe("temperament registry", () => {
    it("recognises every registered id and rejects unknowns", () => {
      // Given the registry; When we guard ids; Then known pass, unknown fail
      for (const t of TEMPERAMENTS) {
        expect(isTemperamentId(t.id)).toBe(true);
      }
      expect(isTemperamentId("dragon")).toBe(false);
      expect(isTemperamentId(null)).toBe(false);
    });

    it("falls back to calm for an unknown temperament", () => {
      // Given an unknown id; When resolved; Then we get a safe default
      expect(getTemperament("nonsense").id).toBe("calm");
    });
  });

  describe("decodeTraits", () => {
    it("is a pure function of the genome", () => {
      // Given the same genome decoded twice
      const genome: Genome = { seed: 424242, temperament: "fiery" };

      // When decoded; Then identical traits come out both times
      expect(decodeTraits(genome)).toEqual(decodeTraits(genome));
    });

    it("keeps the base hue inside the temperament's colour band", () => {
      // Given a fiery genome (hue band 5..35)
      const traits = decodeTraits({ seed: 1, temperament: "fiery" });
      const temperament = getTemperament("fiery");

      // When we read the hue; Then it sits within the band
      expect(traits.hue).toBeGreaterThanOrEqual(temperament.hueRange[0]);
      expect(traits.hue).toBeLessThanOrEqual(temperament.hueRange[1]);
    });

    it("produces visibly different creatures for different seeds", () => {
      // Given two seeds of the same temperament
      const a = decodeTraits({ seed: 1, temperament: "calm" });
      const b = decodeTraits({ seed: 2, temperament: "calm" });

      // When compared; Then at least one visible trait differs (no clones)
      const differs =
        a.hue !== b.hue ||
        a.bodyShape !== b.bodyShape ||
        a.eyeStyle !== b.eyeStyle ||
        a.hasHorns !== b.hasHorns ||
        a.hasWings !== b.hasWings;
      expect(differs).toBe(true);
    });
  });

  describe("rngFor", () => {
    it("derives independent, reproducible streams per name", () => {
      // Given a genome
      const genome: Genome = { seed: 5, temperament: "bold" };

      // When we build the same named stream twice; Then it repeats
      const first = rngFor(genome, "body")();
      const again = rngFor(genome, "body")();
      expect(first).toEqual(again);
    });
  });
});
