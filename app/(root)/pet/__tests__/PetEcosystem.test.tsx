import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StoreContextProvider } from "@/components/StoreProvider";
import { testHabit, testStoreContext } from "@/lib/test/fixtures";
import { todayKey } from "@/lib/helpers";
import type { Pet } from "@/lib/types";

import { PetEcosystem } from "../PetEcosystem";

/**
 * Component tests for the Pet Ecosystem UI. These verify the user-visible
 * behaviour that ties habit completions to caring for pets: earning food,
 * feeding a living companion, adopting a new one, and laying a dead one to rest.
 */

const NOW_ISO = new Date().toISOString();

/** Build a store-shaped pet that is alive and recently simulated (so it renders). */
function makePet(overrides: Partial<Pet> = {}): Pet {
  return {
    id: "pet_1",
    name: "Pip",
    temperament: "calm",
    seed: 12345,
    totalFeeds: 2,
    satiety: 2,
    health: 100,
    bornAt: NOW_ISO,
    lastFedAt: NOW_ISO,
    lastSimAt: NOW_ISO,
    isAlive: true,
    diedAt: null,
    ...overrides,
  };
}

/** A habit completed today, which funds one unit of the shared food pool. */
function completedHabit(id: string) {
  return testHabit({ id, history: { [todayKey()]: true } });
}

function renderEcosystem(store: ReturnType<typeof testStoreContext>) {
  return render(
    <StoreContextProvider value={store}>
      <PetEcosystem />
    </StoreContextProvider>,
  );
}

describe("PetEcosystem", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows available food earned from completed habits", () => {
    // Given two habits completed today (each worth 3 food) and no feeds spent yet
    const store = testStoreContext({
      habits: [completedHabit("h1"), completedHabit("h2")],
      pets: [makePet()],
      petFeedsUsedToday: 0,
    });

    // When the ecosystem renders
    renderEcosystem(store);

    // Then the shared food pool shows 6 units available (2 habits x 3 feeds)
    expect(screen.getByText("6")).toBeTruthy();
    expect(screen.getByText(/food available today/i)).toBeTruthy();
  });

  it("earns food from journalling even without completing a habit", () => {
    // Given no completed habits but two Journal entries written today
    const store = testStoreContext({
      habits: [],
      journal: [
        { id: "j1", date: todayKey(), title: "Reflection", body: "", mood: "good", tags: [] },
        { id: "j2", date: todayKey(), title: "Evening", body: "", mood: "good", tags: [] },
      ],
      pets: [makePet({ satiety: 0 })],
      petFeedsUsedToday: 0,
    });

    // When the ecosystem renders
    renderEcosystem(store);

    // Then journalling alone funds two units of food and feeding is enabled
    expect(screen.getByText("2")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Feed" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows the pet's age and lifetime feeds", () => {
    // Given a freshly-hatched pet that has been fed twice
    const store = testStoreContext({
      habits: [],
      pets: [makePet({ totalFeeds: 2 })],
      petFeedsUsedToday: 0,
    });

    // When the ecosystem renders
    renderEcosystem(store);

    // Then its age and feed count are visible on the card
    expect(screen.getByText(/just hatched/i)).toBeTruthy();
    expect(screen.getByText(/2 feeds fed/i)).toBeTruthy();
  });

  it("releases a living pet when confirmed", () => {
    // Given a living pet and a user who confirms the release prompt
    const deletePet = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const store = testStoreContext({
      habits: [],
      pets: [makePet()],
      petFeedsUsedToday: 0,
      deletePet,
    });

    // When the user presses Release
    renderEcosystem(store);
    fireEvent.click(screen.getByRole("button", { name: /release/i }));

    // Then the store is asked to release that pet
    expect(deletePet).toHaveBeenCalledWith("pet_1");
  });

  it("feeds a living pet using the chosen amount", () => {
    // Given a hungry pet and three units of food
    const feedPet = vi.fn();
    const store = testStoreContext({
      habits: [completedHabit("h1"), completedHabit("h2"), completedHabit("h3")],
      pets: [makePet({ satiety: 0 })],
      petFeedsUsedToday: 0,
      feedPet,
    });

    // When the user presses Feed
    renderEcosystem(store);
    fireEvent.click(screen.getByRole("button", { name: "Feed" }));

    // Then the store is asked to feed that pet by the displayed amount
    expect(feedPet).toHaveBeenCalledWith("pet_1", 1);
  });

  it("disables feeding when there is no food", () => {
    // Given a pet but no completed habits today
    const store = testStoreContext({
      habits: [testHabit({ id: "h1", history: {} })],
      pets: [makePet({ satiety: 0 })],
      petFeedsUsedToday: 0,
    });

    // When the ecosystem renders
    renderEcosystem(store);

    // Then the Feed button is disabled and the user is told to complete a habit
    expect((screen.getByRole("button", { name: "Feed" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/complete a habit to earn food/i)).toBeTruthy();
  });

  it("adopts a companion from the adopt panel", () => {
    // Given an empty ecosystem
    const adoptPet = vi.fn();
    const store = testStoreContext({ habits: [], pets: [], petFeedsUsedToday: 0, adoptPet });

    // When the user names a pet and adopts it
    renderEcosystem(store);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Sunny" } });
    fireEvent.click(screen.getByRole("button", { name: /Adopt Sunny/i }));

    // Then the store adopts with the chosen name and default temperament
    expect(adoptPet).toHaveBeenCalledWith({ name: "Sunny", temperament: "calm" });
  });

  it("offers to lay a dead pet to rest in the graveyard", () => {
    // Given a pet that has died
    const buryPet = vi.fn();
    const store = testStoreContext({
      habits: [],
      pets: [makePet({ isAlive: false, health: 0, satiety: 0, diedAt: NOW_ISO })],
      petFeedsUsedToday: 0,
      buryPet,
    });

    // When the user lays it to rest
    renderEcosystem(store);
    fireEvent.click(screen.getByRole("button", { name: /lay to rest/i }));

    // Then the store buries that pet
    expect(buryPet).toHaveBeenCalledWith("pet_1");
  });

  it("hides the adopt panel once the ecosystem is full", () => {
    // Given three alive pets (the cap)
    const store = testStoreContext({
      habits: [],
      pets: [
        makePet({ id: "p1" }),
        makePet({ id: "p2" }),
        makePet({ id: "p3" }),
      ],
      petFeedsUsedToday: 0,
    });

    // When the ecosystem renders
    renderEcosystem(store);

    // Then there is no adopt panel
    expect(screen.queryByText(/Adopt a companion/i)).toBeNull();
  });
});
