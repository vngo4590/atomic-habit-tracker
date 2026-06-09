/**
 * pet.ts — the brains of the "Pet Companion" tab (a small Tamagotchi).
 *
 * What this is, in plain language:
 *   Each person adopts a tiny pixel creature with its own personality. The pet
 *   gets hungry every day. The only way to feed it is to *complete habits*: each
 *   habit you finish today earns one "food" token, and feeding the pet spends one
 *   token to raise how full (satiated) it feels for the day. The next day it is
 *   hungry again, so the pet gently nudges you to keep showing up.
 *
 * Why localStorage and not the database:
 *   A pet's chosen character and daily feeds are a light, playful UI layer on top
 *   of the real habit data (which already lives in the database). Storing it in
 *   the browser avoids a schema migration for a "simple for now" feature — the
 *   exact same trade-off the named theme variants make (see lib/themes.ts and
 *   lib/appearance.ts). The food itself is always derived from real, persisted
 *   habit completions, so progress can never be faked by editing storage.
 *
 * Everything in this file is pure and synchronous so it is trivial to unit test;
 * React/storage wiring lives in lib/hooks/usePet.ts.
 */

/** Storage key for the mirrored pet state. Namespaced like the other mirrors. */
export const PET_STORAGE_KEY = "atomicly:pet";

/**
 * How many feeds fully satisfy the pet in a single day. Kept small so a few
 * completed habits visibly fill the satiety bar and the loop feels rewarding.
 */
export const MAX_SATIETY = 5;

/** The stable ids of the adoptable characters (a union so UI/CSS can't drift). */
export type PetCharacterId = "sprout" | "ember" | "pebble" | "nimbus" | "pip";

/**
 * A single adoptable creature. `pixels` is a tiny sprite: an array of equal-width
 * rows where each character is a key into `palette` (and "." means a transparent
 * cell). This keeps the art in code — no image assets to ship or load.
 */
export interface PetCharacter {
  /** Stable id used for storage and lookups. */
  id: PetCharacterId;
  /** Friendly display name shown on the card and stage. */
  name: string;
  /** One or two words capturing the personality archetype. */
  personality: string;
  /** A short, encouraging description of who this companion is. */
  blurb: string;
  /** Maps each sprite character to a CSS colour ("." is always transparent). */
  palette: Record<string, string>;
  /** Equal-width rows of palette keys describing the pixel art. */
  pixels: string[];
}

/**
 * The adoptable roster. Each creature has a distinct silhouette and colour so
 * the choices feel like genuinely different personalities, not recolours.
 */
export const PET_CHARACTERS: readonly PetCharacter[] = [
  {
    id: "sprout",
    name: "Sprout",
    personality: "Patient grower",
    blurb: "A calm seedling that thrives on steady, daily watering.",
    palette: { d: "#2f6b2b", g: "#6cc24a", e: "#16321a", m: "#2f6b2b", l: "#3fa34d" },
    pixels: [
      "...ll...",
      "....l...",
      "..dddd..",
      ".dggggd.",
      "dggggggd",
      "dgeggegd",
      "dggggggd",
      ".dgmmgd.",
      "..dddd..",
    ],
  },
  {
    id: "ember",
    name: "Ember",
    personality: "Fiery spark",
    blurb: "An eager little fox-flame that loves an energetic streak.",
    palette: { d: "#b5471a", g: "#f08a3c", e: "#3a1d0c", m: "#7a2f12" },
    pixels: [
      ".d....d.",
      ".dd..dd.",
      "..dddd..",
      ".dggggd.",
      "dggggggd",
      "dgeggegd",
      "dggmmggd",
      ".dggggd.",
      "..dddd..",
    ],
  },
  {
    id: "pebble",
    name: "Pebble",
    personality: "Steady rock",
    blurb: "An unshakeable stone buddy who values showing up consistently.",
    palette: { d: "#5b5750", g: "#9a948a", e: "#2b2925", m: "#5b5750" },
    pixels: [
      "........",
      "dddddddd",
      "dggggggd",
      "dgeggegd",
      "dggggggd",
      "dggmmggd",
      "dggggggd",
      "dddddddd",
      "........",
    ],
  },
  {
    id: "nimbus",
    name: "Nimbus",
    personality: "Dreamy thinker",
    blurb: "A drifting cloud-cat that reflects and rewards mindful days.",
    palette: { d: "#6f93c4", g: "#bcd6f5", e: "#26344a", m: "#6f93c4" },
    pixels: [
      ".gg..gg.",
      "gggggggg",
      "dggggggd",
      "dgeggegd",
      "dggggggd",
      "dggmmggd",
      "dggggggd",
      ".dggggd.",
      "..dddd..",
    ],
  },
  {
    id: "pip",
    name: "Pip",
    personality: "Cheerful friend",
    blurb: "A sunny little bird that celebrates every small win with you.",
    palette: { d: "#c23a78", g: "#ff9ec4", e: "#3a1226", m: "#c23a78", y: "#ffcf4d" },
    pixels: [
      "...dd...",
      "..dddd..",
      ".dggggd.",
      "dgeggegd",
      "dggyyggd",
      "dggggggd",
      ".dggggd.",
      "..dddd..",
      "........",
    ],
  },
] as const;

/** Fast id -> character lookup so resolving a stored choice stays O(1). */
const PET_CHARACTER_BY_ID = new Map<PetCharacterId, PetCharacter>(
  PET_CHARACTERS.map((character) => [character.id, character]),
);

/**
 * Narrowing guard: is this arbitrary string one of our known character ids?
 * Used to validate values read from localStorage before we trust them.
 */
export function isPetCharacterId(value: unknown): value is PetCharacterId {
  return typeof value === "string" && PET_CHARACTER_BY_ID.has(value as PetCharacterId);
}

/** Resolve an id to a character, or null when the id is unknown/missing. */
export function getPetCharacter(id: string | null | undefined): PetCharacter | null {
  if (isPetCharacterId(id)) {
    return PET_CHARACTER_BY_ID.get(id)!;
  }
  return null;
}

/** The mood stages a pet can be in, driven purely by today's feed count. */
export type PetMoodId = "hungry" | "peckish" | "content" | "full";

/** A mood stage with a friendly label and an emoticon-style face. */
export interface PetMood {
  id: PetMoodId;
  label: string;
  face: string;
}

/**
 * The persisted pet state. Deliberately tiny:
 *   - `characterId` is null until the user adopts a companion.
 *   - `feeds` maps a YYYY-MM-DD day key to how many times the pet was fed that
 *     day, which is what makes hunger reset each morning.
 *   - `totalFeeds` is a lifetime counter shown as a fun stat.
 */
export interface PetState {
  characterId: PetCharacterId | null;
  feeds: Record<string, number>;
  totalFeeds: number;
}

/** A fresh, un-adopted pet with no feeding history. */
export function createInitialPetState(): PetState {
  return { characterId: null, feeds: {}, totalFeeds: 0 };
}

/** How many times the pet was fed on a given day (0 if never). */
export function feedsOn(state: PetState, dateKey: string): number {
  const value = state.feeds[dateKey];
  return typeof value === "number" && value > 0 ? value : 0;
}

/**
 * The pet's satiety for the day, capped at MAX_SATIETY. Extra feeds beyond the
 * cap are not possible (see canFeed), so this simply clamps for safety.
 */
export function satietyFor(feedsToday: number): number {
  return Math.max(0, Math.min(feedsToday, MAX_SATIETY));
}

/** Satiety expressed as a 0..1 ratio for rendering the fullness bar. */
export function satietyRatio(feedsToday: number): number {
  return satietyFor(feedsToday) / MAX_SATIETY;
}

/**
 * Food tokens still available to spend right now: one per habit completed today,
 * minus the feeds already used today. Never negative.
 */
export function availableFood(completedToday: number, feedsToday: number): number {
  return Math.max(0, completedToday - feedsToday);
}

/**
 * Can the pet be fed at this moment? Requires an unspent food token AND that the
 * pet is not already full for the day (so satiety has somewhere to go).
 */
export function canFeed(completedToday: number, feedsToday: number): boolean {
  return availableFood(completedToday, feedsToday) > 0 && feedsToday < MAX_SATIETY;
}

/** Map today's feed count to a mood stage with a label and a face. */
export function moodFor(feedsToday: number): PetMood {
  const satiety = satietyFor(feedsToday);
  if (satiety <= 0) {
    return { id: "hungry", label: "Hungry", face: "( ; _ ; )" };
  }
  if (satiety >= MAX_SATIETY) {
    return { id: "full", label: "Full & happy", face: "( ^ w ^ )" };
  }
  if (satiety >= 3) {
    return { id: "content", label: "Content", face: "( ^ _ ^ )" };
  }
  return { id: "peckish", label: "Peckish", face: "( o _ o )" };
}

/** Adopt (or switch to) a character. Pure — returns a new state object. */
export function selectCharacter(state: PetState, id: PetCharacterId): PetState {
  return { ...state, characterId: id };
}

/**
 * Feed the pet once on `dateKey`, spending one of the food tokens earned by the
 * `completedToday` habit completions. Returns the (possibly unchanged) next
 * state plus a `fed` flag so callers know whether a feed actually happened.
 */
export function feedPet(
  state: PetState,
  dateKey: string,
  completedToday: number,
): { state: PetState; fed: boolean } {
  const feedsToday = feedsOn(state, dateKey);
  if (!canFeed(completedToday, feedsToday)) {
    return { state, fed: false };
  }

  return {
    state: {
      ...state,
      feeds: { ...state.feeds, [dateKey]: feedsToday + 1 },
      totalFeeds: state.totalFeeds + 1,
    },
    fed: true,
  };
}

/**
 * Coerce an unknown value (e.g. parsed from localStorage, possibly from an older
 * app version or tampered with) into a valid PetState, dropping anything we don't
 * recognise so the rest of the app can trust the shape.
 */
export function normalizePetState(raw: unknown): PetState {
  const base = createInitialPetState();
  if (typeof raw !== "object" || raw === null) {
    return base;
  }

  const record = raw as Record<string, unknown>;

  const characterId = isPetCharacterId(record.characterId) ? record.characterId : null;

  const feeds: Record<string, number> = {};
  if (typeof record.feeds === "object" && record.feeds !== null) {
    for (const [key, value] of Object.entries(record.feeds as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        feeds[key] = Math.floor(value);
      }
    }
  }

  const totalFeeds =
    typeof record.totalFeeds === "number" && Number.isFinite(record.totalFeeds)
      ? Math.max(0, Math.floor(record.totalFeeds))
      : 0;

  return { characterId, feeds, totalFeeds };
}

/**
 * Read the persisted pet state from localStorage, falling back to a fresh pet
 * when nothing is stored or storage is unavailable (SSR / privacy mode).
 */
export function readPetState(): PetState {
  try {
    const raw = window.localStorage.getItem(PET_STORAGE_KEY);
    if (!raw) {
      return createInitialPetState();
    }
    return normalizePetState(JSON.parse(raw));
  } catch {
    return createInitialPetState();
  }
}

/** Persist the pet state to localStorage, ignoring storage failures. */
export function writePetState(state: PetState): void {
  try {
    window.localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (privacy mode / quota) — the in-memory state
    // still drives the UI for this session, so we silently ignore the failure.
  }
}
