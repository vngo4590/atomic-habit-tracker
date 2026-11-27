import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { todayKey } from "@/lib/helpers";
import type { Habit } from "@/lib/types";

const storeMock = vi.hoisted(() => ({
  habits: [] as Habit[],
  streak: vi.fn<(habit: Habit) => number>(() => 0),
  completionRate: vi.fn<(habit: Habit) => number>(() => 0),
  toggleHabit: vi.fn(),
  logCheckIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

import { HabitsLibrary } from "../HabitsLibrary";

function makeHabit(id: string, name: string, history: Habit["history"] = {}): Habit {
  return {
    id,
    name,
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
    identity: "a reader",
    environment: "",
    schedule: "Daily",
    time: "Morning",
    contract: "",
    contractPartners: [],
    history,
    notes: [],
    createdAt: "2030-01-01",
  };
}

beforeEach(() => {
  storeMock.toggleHabit.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("HabitsLibrary", () => {
  it("offers a New habit call to action when the library is empty", () => {
    // Given: no habits
    storeMock.habits = [];
    // When: the library renders
    render(<HabitsLibrary />);
    // Then: the empty state explains what to do and links to the wizard
    expect(screen.getByRole("heading", { name: "No habits in your account yet." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "New habit" }).getAttribute("href")).toBe("/habits/new");
  });

  it("filters to habits done today when the Done today tab is selected", () => {
    // Given: one habit done today and one not
    storeMock.habits = [
      makeHabit("h1", "Read", { [todayKey()]: { done: true } } as Habit["history"]),
      makeHabit("h2", "Run"),
    ];
    render(<HabitsLibrary />);
    // When: the user picks the Done today tab
    fireEvent.click(screen.getByRole("tab", { name: "Done today" }));
    // Then: only the finished habit is listed
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("Read")).toBeTruthy();
    expect(within(panel).queryByText("Run")).toBeNull();
  });

  it("links each habit to its detail page and toggles today's check-in", () => {
    // Given: one habit not yet done today
    storeMock.habits = [makeHabit("h1", "Read")];
    render(<HabitsLibrary />);
    // Then: the name links to the habit's page
    expect(screen.getByRole("link", { name: /Read/ }).getAttribute("href")).toBe("/habits/h1");
    // When: the user checks it
    fireEvent.click(screen.getByRole("button", { name: "Check Read for today" }));
    // Then: the store records the vote
    expect(storeMock.toggleHabit).toHaveBeenCalledWith("h1");
  });

  it("tells the user when a search has no matches", () => {
    // Given: a habit library
    storeMock.habits = [makeHabit("h1", "Read")];
    render(<HabitsLibrary />);
    // When: searching for something that doesn't exist
    fireEvent.change(screen.getByPlaceholderText("Search habits..."), { target: { value: "zzz" } });
    // Then: a no-results message replaces the list, and search can be cleared
    expect(screen.getByText('No habits match "zzz".')).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("Read")).toBeTruthy();
  });
});
