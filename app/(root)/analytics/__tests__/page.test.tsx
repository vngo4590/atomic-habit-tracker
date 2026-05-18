import { cleanup, render, screen } from "@testing-library/react";
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
    stackAfterId: null,
    contract: "",
    contractPartners: [],
    history: {},
    notes: [],
    createdAt: "2030-01-01",
    ...patch,
  };
}

const storeMock = vi.hoisted(() => ({
  habits: [] as Habit[],
  completionRate: vi.fn(() => 0),
  longestStreak: vi.fn(() => 0),
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

import AnalyticsPage from "@/app/(root)/analytics/page";

afterEach(() => {
  cleanup();
  storeMock.habits = [];
});

describe("AnalyticsPage", () => {
  it("shows an explicit empty state when there is no weekday completion data", () => {
    storeMock.habits = [];

    render(<AnalyticsPage />);

    expect(screen.getByText("No weekday data yet")).toBeTruthy();
  });

  it("renders weekday progress bars with visible percentage labels", () => {
    storeMock.habits = [makeHabit({ history: { [todayKey()]: true } })];

    render(<AnalyticsPage />);

    expect(screen.queryByText("No weekday data yet")).toBeNull();
    expect(screen.getAllByLabelText(/completion \d+%/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\d+\/\d+/)).toBeNull();
  });
});
