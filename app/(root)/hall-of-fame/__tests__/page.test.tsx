import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
    stack: "",
    identity: "reader",
    environment: "",
    schedule: "Daily",
    time: "Morning",
    contract: "",
    contractPartners: [],
    history: {},
    notes: [],
    createdAt: todayKey(),
    ...patch,
  };
}

const storeMock = vi.hoisted(() => ({
  habits: [] as Habit[],
  streak: vi.fn((habit: Habit) => (habit.history[todayKey()] ? 1 : 0)),
  longestStreak: vi.fn(() => 1),
  completionRate: vi.fn((habit: Habit) => (habit.history[todayKey()] ? 1 : 0)),
  formationVerdicts: [],
  saveFormationVerdict: vi.fn(),
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

import HallOfFamePage from "@/app/(root)/hall-of-fame/page";

describe("HallOfFamePage", () => {
  it("shows in-progress task metrics from current habit history", () => {
    storeMock.habits = [makeHabit({ history: { [todayKey()]: true } })];

    render(<HallOfFamePage />);

    expect(screen.getByText("Done today")).toBeTruthy();
    expect(screen.getByText("1d active")).toBeTruthy();
    expect(screen.getByText("100% 30-day")).toBeTruthy();
  });
});
