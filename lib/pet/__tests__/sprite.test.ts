import { describe, expect, it } from "vitest";

import { STAGES, type Stage } from "@/lib/pet/evolution";
import { generateSprite } from "@/lib/pet/sprite";
import type { Genome } from "@/lib/pet/genome";

/**
 * The sprite generator must always return well-formed, bilaterally symmetric art
 * for any genome and stage. Symmetry is what makes the random creatures read as
 * cute animals rather than noise, so we assert it directly.
 */
describe("sprite generator", () => {
  const sampleGenomes: Genome[] = [
    { seed: 1, temperament: "calm" },
    { seed: 99999, temperament: "fiery" },
    { seed: 0x1234abcd, temperament: "playful" },
    { seed: 7, temperament: "gentle" },
  ];

  it("returns equal-width rows for every stage and genome", () => {
    // Given a spread of genomes and every life stage
    for (const genome of sampleGenomes) {
      for (const stage of STAGES) {
        // When we generate the sprite
        const sprite = generateSprite(genome, stage);

        // Then there is at least one row and all rows share one width
        expect(sprite.pixels.length).toBeGreaterThan(0);
        const width = sprite.pixels[0].length;
        for (const row of sprite.pixels) {
          expect(row.length).toBe(width);
        }
      }
    }
  });

  it("is left-right symmetric for hatched stages", () => {
    // Given hatched stages (egg is intentionally a plain oval too, but check all)
    for (const genome of sampleGenomes) {
      for (const stage of STAGES) {
        // When we generate the sprite
        const { pixels } = generateSprite(genome, stage);

        // Then each row mirrors around its centre column
        for (const row of pixels) {
          const reversed = row.split("").reverse().join("");
          expect(row).toBe(reversed);
        }
      }
    }
  });

  it("is fully deterministic for a given (genome, stage)", () => {
    // Given the same genome and stage
    const genome: Genome = { seed: 555, temperament: "curious" };

    // When generated twice; Then the art is identical
    expect(generateSprite(genome, "adult")).toEqual(generateSprite(genome, "adult"));
  });

  it("grows: later stages use a larger canvas than the egg", () => {
    // Given one genome
    const genome: Genome = { seed: 2024, temperament: "bold" };

    // When we measure the egg and the elder
    const egg = generateSprite(genome, "egg");
    const elder = generateSprite(genome, "elder");

    // Then the elder canvas is taller/wider than the egg (the pet visibly grew)
    expect(elder.pixels.length).toBeGreaterThan(egg.pixels.length);
    expect(elder.pixels[0].length).toBeGreaterThanOrEqual(egg.pixels[0].length);
  });

  it("only uses keys that exist in its palette (or transparent dots)", () => {
    // Given a genome and stage
    const genome: Genome = { seed: 31337, temperament: "playful" };
    const stage: Stage = "juvenile";

    // When generated
    const sprite = generateSprite(genome, stage);

    // Then every non-dot key maps to a defined palette colour
    for (const row of sprite.pixels) {
      for (const key of row.split("")) {
        if (key === ".") continue;
        expect(sprite.palette[key]).toBeDefined();
      }
    }
  });

  it("draws eyes on hatched creatures but not on the egg", () => {
    // Given a genome
    const genome: Genome = { seed: 42, temperament: "gentle" };

    // When we generate egg vs adult
    const egg = generateSprite(genome, "egg").pixels.join("");
    const adult = generateSprite(genome, "adult").pixels.join("");

    // Then the adult has eye pixels ("e") and the egg has none
    expect(adult).toContain("e");
    expect(egg).not.toContain("e");
  });
});
