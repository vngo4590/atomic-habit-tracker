import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { todayKey } from "@/lib/helpers";
import { __resetPetStoreForTests } from "@/lib/hooks/usePet";
import { PET_STORAGE_KEY } from "@/lib/pet";
import type { Habit } from "@/lib/types";

/** Mutable store snapshot the mocked useStoreContext reads from. */
const storeMock = vi.hoisted(() => ({ habits: [] as Habit[] }));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

import PetPage from "@/app/(root)/pet/page";

/** Build a habit, optionally marked done for today. */
function makeHabit(done: boolean): Habit {
  return {
    id: "habit_1",
    name: "Read",
    emoji: "•",
    cue: "",
    craving: "",
    response: "",
    reward: "",
    loopCue: "",
    loopCraving: "",
    loopResponse: "",
    loopReward: "",
    twoMin: "",
    identity: "reader",
    environment: "",
    schedule: "Daily",
    time: "Morning",
    contract: "",
    contractPartners: [],
    history: done ? { [todayKey()]: true } : {},
    notes: [],
    createdAt: "2030-01-01",
  };
}

describe("PetPage", () => {
  beforeEach(() => {
    storeMock.habits = [];
    // Per-file localStorage stub so the pet's persisted state is isolated.
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
    __resetPetStoreForTests();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the character picker to a first-time visitor", () => {
    // Given: no pet has been adopted yet
    storeMock.habits = [makeHabit(true)];

    // When: the Pet tab renders
    render(<PetPage />);

    // Then: the adoption picker is shown with the roster of companions
    expect(screen.getByText("Choose your companion")).toBeTruthy();
    expect(screen.getByLabelText(/Adopt Sprout/i)).toBeTruthy();
  });

  it("lets the user feed their companion after completing a habit", () => {
    // Given: the user has completed one habit today (one food token)
    storeMock.habits = [makeHabit(true)];
    render(<PetPage />);

    // When: they adopt a companion
    fireEvent.click(screen.getByLabelText(/Adopt Sprout/i));

    // Then: the pet stage appears, hungry, with one piece of food available
    expect(screen.getByText("Sprout")).toBeTruthy();
    expect(screen.getByText("Hungry")).toBeTruthy();
    const feedButton = screen.getByRole("button", { name: /Feed your companion/i });
    expect(feedButton.hasAttribute("disabled")).toBe(false);
    expect(screen.getByText("Satiety 0 / 5")).toBeTruthy();

    // When: they feed the pet
    fireEvent.click(feedButton);

    // Then: satiety rises, the food is spent, and feeding is no longer possible
    expect(screen.getByText("Satiety 1 / 5")).toBeTruthy();
    expect(screen.getByText(/Complete a habit to earn food/i)).toBeTruthy();

    // And: the persisted state records the feed for future visits
    const stored = JSON.parse(window.localStorage.getItem(PET_STORAGE_KEY)!);
    expect(stored.characterId).toBe("sprout");
    expect(stored.feeds[todayKey()]).toBe(1);
    expect(stored.totalFeeds).toBe(1);
  });

  it("cannot feed the pet when no habit has been completed today", () => {
    // Given: a habit exists but is not done today (no food earned)
    storeMock.habits = [makeHabit(false)];
    render(<PetPage />);

    // When: the user adopts a companion
    fireEvent.click(screen.getByLabelText(/Adopt Ember/i));

    // Then: the feed action is disabled and prompts the user to complete a habit
    const feedButton = screen.getByRole("button", { name: /Feed your companion/i });
    expect(feedButton.hasAttribute("disabled")).toBe(true);
    expect(within(feedButton).getByText(/Complete a habit to earn food/i)).toBeTruthy();
  });
});
