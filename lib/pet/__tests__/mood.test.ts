import { describe, expect, it } from "vitest";

import { deriveMood, moodById, type MoodContext } from "@/lib/pet/mood";
import { MAX_HEALTH, MAX_SATIETY, type PetVitals } from "@/lib/pet/simulation";

/**
 * Mood is the pet's "face": it turns raw vitals into a feeling the UI animates.
 * These tests pin the priority order so urgent states (death, sickness) always
 * win over pleasant ones, and so feeding visibly delights the pet.
 */
describe("mood", () => {
  const now = 1_700_000_000_000;

  function vitals(overrides: Partial<PetVitals> = {}): PetVitals {
    return {
      satiety: MAX_SATIETY / 2,
      health: MAX_HEALTH,
      lastSimAt: now,
      lastFedAt: now - 10 * 60 * 1000, // fed 10 min ago by default (not "just fed")
      bornAt: now - 86_400_000,
      isAlive: true,
      diedAt: null,
      ...overrides,
    };
  }

  const dayCtx: MoodContext = { now, hour: 14 };
  const nightCtx: MoodContext = { now, hour: 23 };

  it("shows 'dead' for a pet that has died, above all else", () => {
    // Given a dead pet that would otherwise look full and healthy
    const mood = deriveMood(vitals({ isAlive: false, satiety: MAX_SATIETY, health: MAX_HEALTH }), dayCtx);

    // Then mood is dead
    expect(mood.id).toBe("dead");
  });

  it("shows 'sick' when health is low, overriding hunger and sleep", () => {
    // Given a low-health pet at night with food
    const mood = deriveMood(vitals({ health: 20, satiety: MAX_SATIETY }), nightCtx);

    // Then sickness takes priority
    expect(mood.id).toBe("sick");
  });

  it("shows 'excited' immediately after feeding", () => {
    // Given a pet fed just now with food in its belly
    const mood = deriveMood(vitals({ lastFedAt: now, satiety: MAX_SATIETY }), dayCtx);

    // Then it is excited
    expect(mood.id).toBe("excited");
  });

  it("shows 'inLove' when thriving (full belly and full health)", () => {
    // Given a brimming, healthy pet that was not just fed
    const mood = deriveMood(vitals({ satiety: MAX_SATIETY, health: MAX_HEALTH, lastFedAt: now - 600_000 }), dayCtx);

    // Then it is lovestruck
    expect(mood.id).toBe("inLove");
  });

  it("shows 'hungry' when the belly is empty (and not just fed)", () => {
    // Given an empty but still-healthy pet
    const mood = deriveMood(vitals({ satiety: 0, health: 80 }), dayCtx);

    // Then it pleads hungry
    expect(mood.id).toBe("hungry");
  });

  it("sleeps at night when reasonably content", () => {
    // Given a content pet at 11pm
    const mood = deriveMood(vitals({ satiety: MAX_SATIETY * 0.5, health: 80 }), nightCtx);

    // Then it is sleeping
    expect(mood.id).toBe("sleeping");
  });

  it("is 'happy' with a good amount of food during the day", () => {
    // Given a well-fed pet at midday
    const mood = deriveMood(vitals({ satiety: MAX_SATIETY * 0.7, health: 80 }), dayCtx);

    // Then it is happy
    expect(mood.id).toBe("happy");
  });

  it("is 'content' as the neutral fallback", () => {
    // Given a middling pet during the day
    const mood = deriveMood(vitals({ satiety: MAX_SATIETY * 0.4, health: 80 }), dayCtx);

    // Then it is merely content
    expect(mood.id).toBe("content");
  });

  it("pairs every mood with an idle animation descriptor", () => {
    // Given each mood id; Then it resolves to a presentation with an animation
    for (const id of ["dead", "sick", "hungry", "sleeping", "content", "happy", "excited", "inLove"] as const) {
      const mood = moodById(id);
      expect(mood.id).toBe(id);
      expect(mood.animation).toBeTruthy();
      expect(mood.label.length).toBeGreaterThan(0);
    }
  });
});
