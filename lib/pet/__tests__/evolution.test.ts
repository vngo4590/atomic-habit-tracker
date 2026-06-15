import { describe, expect, it } from "vitest";

import {
  didEvolve,
  feedsUntilNextStage,
  nextStage,
  STAGE_FEED_THRESHOLDS,
  STAGES,
  stageForFeeds,
  stageIndex,
  visibleFeatures,
} from "@/lib/pet/evolution";
import type { Traits } from "@/lib/pet/genome";

/**
 * Evolution turns lifetime feeds into life stages, and gates which features show
 * at each stage. These tests lock the thresholds and the "lineage + surprise"
 * rule: a feature the genome enabled must only appear once the pet is old enough.
 */
describe("evolution", () => {
  describe("stageForFeeds", () => {
    it("maps feed milestones to the expected stages", () => {
      // Given the published thresholds [0,1,8,20,45]
      // When/Then each boundary lands on the right stage
      expect(stageForFeeds(0)).toBe("egg");
      expect(stageForFeeds(1)).toBe("hatchling");
      expect(stageForFeeds(7)).toBe("hatchling");
      expect(stageForFeeds(8)).toBe("juvenile");
      expect(stageForFeeds(20)).toBe("adult");
      expect(stageForFeeds(45)).toBe("elder");
      expect(stageForFeeds(1000)).toBe("elder");
    });

    it("never regresses as feeds increase", () => {
      // Given an increasing feed count
      let lastIndex = -1;

      // When we walk feeds upward; Then the stage index is monotonic
      for (let feeds = 0; feeds <= 60; feeds += 1) {
        const index = stageIndex(stageForFeeds(feeds));
        expect(index).toBeGreaterThanOrEqual(lastIndex);
        lastIndex = index;
      }
    });
  });

  describe("nextStage & feedsUntilNextStage", () => {
    it("reports the upcoming stage and remaining feeds", () => {
      // Given a hatchling at 5 feeds (juvenile needs 8)
      // When we ask what's next; Then it is juvenile in 3 feeds
      expect(nextStage("hatchling")).toBe("juvenile");
      expect(feedsUntilNextStage(5)).toBe(3);
    });

    it("returns null at the final stage", () => {
      // Given an elder; When we ask for the next; Then there is none
      expect(nextStage("elder")).toBeNull();
      expect(feedsUntilNextStage(100)).toBeNull();
    });
  });

  describe("didEvolve", () => {
    it("detects crossing a stage boundary", () => {
      // Given feeds moving from 7 to 8 (hatchling -> juvenile)
      // When checked; Then it counts as an evolution
      expect(didEvolve(7, 8)).toBe(true);
    });

    it("returns false within the same stage", () => {
      // Given feeds moving from 2 to 5 (still hatchling)
      // When checked; Then no evolution occurred
      expect(didEvolve(2, 5)).toBe(false);
    });
  });

  describe("visibleFeatures", () => {
    const allOn: Traits = {
      hue: 0,
      accentHue: 0,
      bodyShape: "round",
      eyeStyle: "dot",
      hasHorns: true,
      hasEars: true,
      hasWings: true,
      hasSpots: true,
      plumpness: 0.5,
    };

    it("reveals features progressively across stages", () => {
      // Given a genome that enables every feature
      // When we read visible features at each stage
      // Then ears appear at hatchling, horns at juvenile, wings/spots at adult
      expect(visibleFeatures(allOn, "egg")).toEqual({
        ears: false,
        horns: false,
        wings: false,
        spots: false,
      });
      expect(visibleFeatures(allOn, "hatchling").ears).toBe(true);
      expect(visibleFeatures(allOn, "hatchling").horns).toBe(false);
      expect(visibleFeatures(allOn, "juvenile").horns).toBe(true);
      expect(visibleFeatures(allOn, "adult").wings).toBe(true);
      expect(visibleFeatures(allOn, "adult").spots).toBe(true);
    });

    it("never shows a feature the genome did not enable", () => {
      // Given a genome with no optional features
      const none: Traits = { ...allOn, hasHorns: false, hasEars: false, hasWings: false, hasSpots: false };

      // When read at the oldest stage; Then nothing is revealed
      expect(visibleFeatures(none, "elder")).toEqual({
        ears: false,
        horns: false,
        wings: false,
        spots: false,
      });
    });
  });

  it("keeps STAGES and thresholds the same length", () => {
    // Given the two parallel arrays; Then they line up 1:1
    expect(STAGES.length).toBe(STAGE_FEED_THRESHOLDS.length);
  });
});
