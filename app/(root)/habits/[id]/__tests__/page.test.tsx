import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { todayKey } from "@/lib/helpers";
import type { Habit } from "@/lib/types";

function makeHabit(patch: Partial<Habit> = {}): Habit {
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
    history: {},
    notes: [],
    createdAt: "2030-01-01",
    ...patch,
  };
}

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

const storeMock = vi.hoisted(() => ({
  habits: [] as Habit[],
  streak: vi.fn(() => 0),
  longestStreak: vi.fn(() => 0),
  completionRate: vi.fn(() => 0),
  toggleHabit: vi.fn(),
  deleteHabit: vi.fn(),
  updateHabit: vi.fn(),
  logCheckIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "habit_1" }),
  useRouter: () => routerMock,
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

import HabitDetailPage from "@/app/(root)/habits/[id]/page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("HabitDetailPage", () => {
  it("combines the loop and 4 laws setup into opt-in overview panels", () => {
    storeMock.habits = [makeHabit()];

    render(<HabitDetailPage />);

    expect(screen.queryByRole("button", { name: "Loop" })).toBeNull();
    expect(screen.getByRole("button", { name: "Define the 4 laws" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Define the loop" })).toBeTruthy();
    expect(screen.queryByText("1. Make it obvious")).toBeNull();
    expect(screen.queryByText("Every habit follows the same four steps. Here's yours, laid out as a sentence diagram.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Define the 4 laws" }));
    expect(screen.getByText("1. Make it obvious")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Define the loop" }));
    expect(screen.getByText("Every habit follows the same four steps. Here's yours, laid out as a sentence diagram.")).toBeTruthy();
  });

  it("shows saved laws and loop by default and can clear them back to intro panels", () => {
    storeMock.habits = [
      makeHabit({
        cue: "After coffee",
        craving: "Feel focused",
        twoMin: "Read one page",
        reward: "Mark the vote",
        loopCue: "Coffee poured",
        loopCraving: "A quiet mind",
        loopResponse: "Read one page",
        loopReward: "Highlighted sentence",
      }),
    ];

    const { rerender } = render(<HabitDetailPage />);

    expect(screen.getByText("1. Make it obvious")).toBeTruthy();
    expect(screen.getByText("Every habit follows the same four steps. Here's yours, laid out as a sentence diagram.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear laws" }));
    expect(storeMock.updateHabit).toHaveBeenCalledWith("habit_1", { cue: "", craving: "", twoMin: "", reward: "" });
    storeMock.habits = [makeHabit()];
    rerender(<HabitDetailPage />);
    expect(screen.getByRole("button", { name: "Define the 4 laws" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Define the loop" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear loop" }));
    expect(storeMock.updateHabit).toHaveBeenCalledWith("habit_1", { loopCue: "", loopCraving: "", loopResponse: "", loopReward: "" });
    rerender(<HabitDetailPage />);
    expect(screen.getByRole("button", { name: "Define the loop" })).toBeTruthy();
  });

  it("labels the post-completion primary button 'Done today · tap to unmark'", () => {
    // Given: a habit marked done for today
    const today = todayKey();
    storeMock.habits = [makeHabit({ history: { [today]: true } })];

    // When: the detail page renders
    render(<HabitDetailPage />);

    // Then: the primary button reads the clarified copy, not the old "undo"
    expect(screen.getByRole("button", { name: /Done today · tap to unmark/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Done today · undo$/ })).toBeNull();
  });

  it("labels the primary button 'Mark done' when the habit is not done today", () => {
    // Given: a habit with no check-in for today
    storeMock.habits = [makeHabit({ history: {} })];

    // When: the detail page renders
    render(<HabitDetailPage />);

    // Then: the primary button reads "Mark done"
    expect(screen.getByRole("button", { name: "Mark done" })).toBeTruthy();
  });
});
