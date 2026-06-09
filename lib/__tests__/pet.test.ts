import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MAX_SATIETY,
  PET_CHARACTERS,
  PET_STORAGE_KEY,
  availableFood,
  canFeed,
  createInitialPetState,
  feedPet,
  feedsOn,
  getPetCharacter,
  isPetCharacterId,
  moodFor,
  normalizePetState,
  readPetState,
  satietyFor,
  satietyRatio,
  selectCharacter,
  writePetState,
  type PetState,
} from "@/lib/pet";

const TODAY = "2030-06-09";

/* -------------------------------------------------------------------------- */
/* Character registry                                                          */
/* -------------------------------------------------------------------------- */

describe("pet character registry", () => {
  it("offers several distinct, well-formed personality characters", () => {
    // Given: the adoptable roster
    // Then: there are multiple choices, each with a unique id and rectangular art
    expect(PET_CHARACTERS.length).toBeGreaterThanOrEqual(4);

    const ids = PET_CHARACTERS.map((character) => character.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const character of PET_CHARACTERS) {
      expect(character.name.length).toBeGreaterThan(0);
      expect(character.personality.length).toBeGreaterThan(0);
      // Every sprite row must share the same width so it renders as a clean grid.
      const width = character.pixels[0].length;
      for (const row of character.pixels) {
        expect(row.length).toBe(width);
      }
    }
  });

  it("resolves known ids and rejects unknown ones", () => {
    // Given: a real id and a bogus one
    // Then: only the real id resolves to a character
    expect(isPetCharacterId("sprout")).toBe(true);
    expect(isPetCharacterId("dragon")).toBe(false);
    expect(getPetCharacter("sprout")?.name).toBe("Sprout");
    expect(getPetCharacter("dragon")).toBeNull();
    expect(getPetCharacter(null)).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Feeding mechanics                                                           */
/* -------------------------------------------------------------------------- */

describe("feeding mechanics", () => {
  it("earns one food token per habit completed today", () => {
    // Given: 3 habits completed and 1 feed already spent today
    // Then: 2 food tokens remain
    expect(availableFood(3, 1)).toBe(2);
    // And: food never goes negative if somehow over-fed
    expect(availableFood(0, 2)).toBe(0);
  });

  it("allows feeding only when food is available and the pet is not full", () => {
    // Given: food available and room in the belly
    expect(canFeed(2, 0)).toBe(true);
    // Given: no habits completed today -> no food
    expect(canFeed(0, 0)).toBe(false);
    // Given: already full for the day
    expect(canFeed(10, MAX_SATIETY)).toBe(false);
  });

  it("feeding spends a token, raises satiety, and bumps the lifetime counter", () => {
    // Given: a fresh pet and one completed habit today
    const start = createInitialPetState();

    // When: the pet is fed
    const { state: afterFirst, fed } = feedPet(start, TODAY, 1);

    // Then: the feed succeeded and state advanced
    expect(fed).toBe(true);
    expect(feedsOn(afterFirst, TODAY)).toBe(1);
    expect(afterFirst.totalFeeds).toBe(1);

    // And: with no remaining food, a second feed is a no-op
    const { state: afterSecond, fed: fedAgain } = feedPet(afterFirst, TODAY, 1);
    expect(fedAgain).toBe(false);
    expect(feedsOn(afterSecond, TODAY)).toBe(1);
    expect(afterSecond).toBe(afterFirst); // unchanged reference on no-op
  });

  it("does not mutate the input state when feeding", () => {
    // Given: a pet state
    const start = createInitialPetState();

    // When: it is fed
    feedPet(start, TODAY, 1);

    // Then: the original object is untouched (pure function)
    expect(start.feeds[TODAY]).toBeUndefined();
    expect(start.totalFeeds).toBe(0);
  });

  it("caps satiety at MAX_SATIETY and never reports a ratio above 1", () => {
    // Given: more feeds than the cap
    // Then: satiety clamps and the ratio stays within 0..1
    expect(satietyFor(MAX_SATIETY + 3)).toBe(MAX_SATIETY);
    expect(satietyRatio(MAX_SATIETY + 3)).toBe(1);
    expect(satietyRatio(0)).toBe(0);
  });

  it("hunger resets per day because feeds are keyed by date", () => {
    // Given: a pet fed twice yesterday
    const state: PetState = { characterId: "ember", feeds: { "2030-06-08": 2 }, totalFeeds: 2 };

    // Then: today it has eaten nothing and is hungry again
    expect(feedsOn(state, TODAY)).toBe(0);
    expect(moodFor(feedsOn(state, TODAY)).id).toBe("hungry");
  });
});

/* -------------------------------------------------------------------------- */
/* Mood stages                                                                 */
/* -------------------------------------------------------------------------- */

describe("mood stages", () => {
  it("maps satiety to escalating moods", () => {
    expect(moodFor(0).id).toBe("hungry");
    expect(moodFor(1).id).toBe("peckish");
    expect(moodFor(3).id).toBe("content");
    expect(moodFor(MAX_SATIETY).id).toBe("full");
  });
});

/* -------------------------------------------------------------------------- */
/* Character selection                                                         */
/* -------------------------------------------------------------------------- */

describe("character selection", () => {
  it("adopts a character without disturbing feed history", () => {
    // Given: a pet with some feeds but no chosen character
    const start: PetState = { characterId: null, feeds: { [TODAY]: 2 }, totalFeeds: 2 };

    // When: a character is adopted
    const next = selectCharacter(start, "nimbus");

    // Then: the choice is recorded and history is preserved
    expect(next.characterId).toBe("nimbus");
    expect(next.feeds[TODAY]).toBe(2);
    expect(start.characterId).toBeNull(); // input untouched
  });
});

/* -------------------------------------------------------------------------- */
/* Persistence + validation                                                    */
/* -------------------------------------------------------------------------- */

describe("persistence and validation", () => {
  beforeEach(() => {
    // Per-file localStorage stub (see testing-practices memory) so reads/writes
    // are isolated and do not leak across workers.
    const store = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
        clear: () => store.clear(),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("round-trips state through localStorage", () => {
    // Given: a chosen, fed pet
    const state: PetState = { characterId: "pip", feeds: { [TODAY]: 3 }, totalFeeds: 7 };

    // When: it is written and read back
    writePetState(state);

    // Then: storage holds the namespaced key and the value survives the trip
    expect(window.localStorage.getItem(PET_STORAGE_KEY)).toBeTruthy();
    expect(readPetState()).toEqual(state);
  });

  it("falls back to a fresh pet when storage is empty", () => {
    // Given: nothing stored
    // Then: a clean initial pet is returned
    expect(readPetState()).toEqual(createInitialPetState());
  });

  it("normalizes malformed or tampered stored data", () => {
    // Given: junk in storage (bad character, negative feeds, wrong types)
    const dirty = {
      characterId: "dragon",
      feeds: { [TODAY]: -4, "2030-06-08": 2, bad: "x" },
      totalFeeds: "lots",
    };

    // When: normalized
    const clean = normalizePetState(dirty);

    // Then: unknown character drops to null, only valid positive feeds survive,
    // and a non-numeric counter resets to 0
    expect(clean.characterId).toBeNull();
    expect(clean.feeds[TODAY]).toBeUndefined();
    expect(clean.feeds["2030-06-08"]).toBe(2);
    expect(clean.feeds.bad).toBeUndefined();
    expect(clean.totalFeeds).toBe(0);
  });

  it("survives corrupt JSON in storage", () => {
    // Given: invalid JSON stored under the pet key
    window.localStorage.setItem(PET_STORAGE_KEY, "{not json");

    // Then: reading returns a fresh pet instead of throwing
    expect(readPetState()).toEqual(createInitialPetState());
  });
});
