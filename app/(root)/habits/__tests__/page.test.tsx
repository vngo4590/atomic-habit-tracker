import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Habit } from "@/lib/types";

function makeHabit(): Habit {
  return {
    id: "habit_1",
    name: "Read",
    emoji: "•",
    cue: "After coffee",
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
    schedule: "Mon, Tue, Wed, Thu, Fri",
    time: "Morning",
    contract: "",
    contractPartners: [],
    history: {},
    notes: [],
    createdAt: "2030-01-01",
  };
}

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

const storeMock = vi.hoisted(() => ({
  habits: [] as Habit[],
  streak: vi.fn(() => 0),
  completionRate: vi.fn(() => 0),
  toggleHabit: vi.fn(),
  logCheckIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

import HabitsPage from "@/app/(root)/habits/page";

describe("HabitsPage", () => {
  it("renders simplified habit cards with check circles, name, identity, streak and 30-day rate", () => {
    storeMock.habits = [makeHabit()];

    render(<HabitsPage />);

    expect(screen.getByText("Read")).toBeTruthy();
    expect(screen.getByText(/reader/i)).toBeTruthy();
    expect(screen.getByText("0d")).toBeTruthy();
    expect(screen.getByText("0%")).toBeTruthy();

    // No header row or column labels
    expect(screen.queryByText("Habit")).toBeFalsy();
    expect(screen.queryByText("Streak")).toBeFalsy();
    expect(screen.queryByText("30-day")).toBeFalsy();
    expect(screen.queryByText("Cue")).toBeFalsy();
    expect(screen.queryByText("Best")).toBeFalsy();
  });
});
