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
    stack: "",
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
  longestStreak: vi.fn(() => 0),
  completionRate: vi.fn(() => 0),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

import HabitsPage from "@/app/(root)/habits/page";

describe("HabitsPage", () => {
  it("renders per-field labels for the responsive habit list layout", () => {
    storeMock.habits = [makeHabit()];

    render(<HabitsPage />);

    expect(screen.getAllByText("Habit").length).toBeGreaterThan(0);
    expect(screen.getByText("Cue")).toBeTruthy();
    expect(screen.getAllByText("Streak").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Best").length).toBeGreaterThan(0);
    expect(screen.getAllByText("30-day").length).toBeGreaterThan(0);
    expect(screen.getByText(/reader · Weekdays/i)).toBeTruthy();
  });
});
