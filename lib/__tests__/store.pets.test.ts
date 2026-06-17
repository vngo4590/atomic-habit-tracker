import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { adoptPetAction, feedPetAction } from "@/lib/actions/pets";
import { useStore } from "@/lib/store";
import type { Pet, StoreSnapshot } from "@/lib/types";

import { makeLocalStorageMock } from "./_store-test-helpers";

/**
 * Store-level tests for the pet ecosystem callbacks. These guard two bugs the
 * user reported:
 *   1. A hungry pet's fullness bar would jump to full and then snap back when
 *      fed — because the optimistic update added food to the *stored* (stale)
 *      satiety instead of the live, decayed value. We now simulate to "now"
 *      first, so the optimistic bar matches what the server returns.
 *   2. An adoption refused by the monthly limit showed a generic production
 *      error instead of the real reason. The action now returns a reason code
 *      that the store turns into a clear, user-facing message.
 */

// Keep the store's server actions out of these unit tests entirely.
vi.mock("@/lib/actions/domain", () => ({
  createHabitAction: vi.fn(),
  createJournalEntryAction: vi.fn(),
  deleteHabitAction: vi.fn(),
  logCheckInAction: vi.fn(async () => null),
  markLessonReadAction: vi.fn(),
  saveFormationVerdictAction: vi.fn(),
  saveIdentityAction: vi.fn(async (identity) => identity),
  savePreferencesAction: vi.fn(),
  saveWeeklyReviewAction: vi.fn(),
  toggleHabitAction: vi.fn(async () => null),
  updateHabitAction: vi.fn(async () => null),
  updateJournalEntryAction: vi.fn(async () => null),
}));

vi.mock("@/lib/actions/pets", () => ({
  adoptPetAction: vi.fn(),
  buryPetAction: vi.fn(),
  deletePetAction: vi.fn(),
  feedPetAction: vi.fn(),
}));

const DAY_MS = 86_400_000;

/** Build a Pet fixture, defaulting to a healthy, alive companion at `now`. */
function makePet(now: number, overrides: Partial<Pet> = {}): Pet {
  const iso = new Date(now).toISOString();
  return {
    id: "pet_1",
    name: "Pip",
    temperament: "calm",
    seed: 12345,
    totalFeeds: 5,
    satiety: 2,
    health: 100,
    bornAt: iso,
    lastFedAt: iso,
    lastSimAt: iso,
    isAlive: true,
    diedAt: null,
    ...overrides,
  };
}

/** A snapshot with a single pet and the supplied feeds-used count. */
function snapshotWith(pet: Pet, feedsUsed = 0): StoreSnapshot {
  return {
    habits: [],
    journal: [],
    identity: { statement: "", values: [] },
    weeklyReview: { wentWell: "", smallestFix: "", identityVote: "" },
    weeklyReviews: [],
    completedLessons: [],
    formationVerdicts: [],
    preferences: {
      theme: "light",
      accentHue: 60,
      remindersEnabled: true,
      weeklyReviewNudge: true,
      accountabilityNudge: false,
      onboardingSeen: false,
      lessonMode: "sequential",
      timezone: "UTC",
    },
    pets: [pet],
    petFeedsUsedToday: feedsUsed,
  };
}

describe("store pet callbacks", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: makeLocalStorageMock(),
    });
    vi.clearAllMocks();
  });

  describe("feedPet — optimistic fullness", () => {
    // Given a pet last simulated three days ago (so its real satiety has decayed
    // close to empty) but still alive,
    // When the user feeds it one unit,
    // Then the optimistic satiety reflects the decayed value plus the feed — well
    // below the stale stored satiety + amount — so the bar no longer jumps to full.
    it("feeds from the live (decayed) satiety, not the stale stored value", () => {
      const now = Date.now();
      const threeDaysAgo = new Date(now - 3 * DAY_MS).toISOString();
      const pet = makePet(now, { satiety: 2, lastSimAt: threeDaysAgo, lastFedAt: threeDaysAgo, bornAt: threeDaysAgo });

      // Hold the server response pending so we observe the optimistic state alone.
      vi.mocked(feedPetAction).mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useStore(snapshotWith(pet)));

      act(() => {
        void result.current.feedPet("pet_1", 1);
      });

      const optimistic = result.current.pets[0];
      // Stored(2) + 1 would have been 3 (full); the decayed-then-fed value is far lower.
      expect(optimistic.satiety).toBeLessThan(2);
      expect(optimistic.satiety).toBeGreaterThan(0);
    });
  });

  describe("adoptPet — surfaced refusal reasons", () => {
    // Given the server refuses adoption because of the monthly limit,
    // When the user tries to adopt,
    // Then a clear, user-facing reason is shown and no pet is added.
    it("shows the monthly-limit message instead of a generic error", async () => {
      vi.mocked(adoptPetAction).mockResolvedValue({ ok: false, reason: "monthly" });

      const { result } = renderHook(() => useStore());

      await act(async () => {
        await result.current.adoptPet({ name: "New", temperament: "calm" });
      });

      expect(result.current.pets).toHaveLength(0);
      expect(result.current.toast?.msg).toBe("Couldn't adopt pet");
      expect(result.current.toast?.sub).toMatch(/one pet per month/);
    });

    // Given the server accepts the adoption,
    // When the user adopts,
    // Then the new pet is appended to the ecosystem.
    it("appends the new pet on success", async () => {
      const now = Date.now();
      vi.mocked(adoptPetAction).mockResolvedValue({ ok: true, pet: makePet(now, { id: "pet_new", name: "Ember" }) });

      const { result } = renderHook(() => useStore());

      await act(async () => {
        await result.current.adoptPet({ name: "Ember", temperament: "calm" });
      });

      expect(result.current.pets).toHaveLength(1);
      expect(result.current.pets[0].name).toBe("Ember");
    });
  });
});
