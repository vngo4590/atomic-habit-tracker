import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dateAdd, todayKey } from "@/lib/helpers";
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

const storeMock = vi.hoisted(() => ({
  habits: [] as Habit[],
  completionRate: vi.fn<(habit: Habit, days?: number) => number>(() => 0),
  streak: vi.fn(() => 0),
  longestStreak: vi.fn(() => 0),
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

import { AnalyticsView } from "../AnalyticsView";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  storeMock.habits = [];
  storeMock.completionRate.mockImplementation(() => 0);
  storeMock.longestStreak.mockImplementation(() => 0);
});

describe("AnalyticsView", () => {
  it("shows explicit empty states with next steps when there are no habits", () => {
    // Given: no habits
    render(<AnalyticsView />);

    // Then: weekday and per-habit sections explain what to do next
    expect(screen.getByText("No weekday data yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Create a habit" }).getAttribute("href")).toBe("/habits/new");
  });

  it("renders weekday progress bars with accessible percentage labels", () => {
    // Given: a daily habit checked in today
    storeMock.habits = [makeHabit({ history: { [todayKey()]: true } })];

    render(<AnalyticsView />);

    // Then: each weekday row is labelled with its completion (not colour-only)
    expect(screen.queryByText("No weekday data yet")).toBeNull();
    expect(screen.getAllByLabelText(/completion \d+%/i)).toHaveLength(7);
  });

  it("summarises completion rate, best streak and all-time check-ins", () => {
    // Given: two habits with history and known streaks
    const today = todayKey();
    storeMock.habits = [
      makeHabit({ id: "a", name: "Read", history: { [today]: true, [dateAdd(today, -1)]: true } }),
      makeHabit({ id: "b", name: "Walk", history: { [today]: true, "2020-01-01": true } }),
    ];
    storeMock.longestStreak.mockImplementation(((habit: Habit) => (habit.id === "b" ? 9 : 2)) as () => number);

    render(<AnalyticsView />);

    // Then: the KPIs reflect the data
    const kpis = within(screen.getByText("Completion rate").closest("dl")!);
    expect(kpis.getByText("Completion rate")).toBeTruthy();
    expect(kpis.getByText("9 days")).toBeTruthy();
    expect(kpis.getByText("Walk")).toBeTruthy();
    expect(within(screen.getByTestId("kpi-total-check-ins")).getByText("4")).toBeTruthy();
  });

  it("re-computes the trend and per-habit rates when the date range changes", () => {
    // Given: one habit; the store reports different rates per window
    storeMock.habits = [makeHabit({ history: { [todayKey()]: true } })];
    storeMock.completionRate.mockImplementation((_habit: Habit, days?: number) => (days === 14 ? 0.5 : 0.8));

    render(<AnalyticsView />);
    const range = within(screen.getByRole("group", { name: "Date range" }));
    expect(range.getByRole("button", { name: "30 days" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Completion over the last 30 days.")).toBeTruthy();
    const byHabit = within(screen.getByRole("region", { name: "By habit" }));
    expect(byHabit.getByText("80%")).toBeTruthy();

    // When: the user picks 14 days
    fireEvent.click(range.getByRole("button", { name: "14 days" }));

    // Then: the control, captions and per-habit rate follow the new range
    expect(range.getByRole("button", { name: "14 days" }).getAttribute("aria-pressed")).toBe("true");
    expect(range.getByRole("button", { name: "30 days" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Completion over the last 14 days.")).toBeTruthy();
    expect(byHabit.getByText("50%")).toBeTruthy();
    expect(storeMock.completionRate).toHaveBeenCalledWith(expect.anything(), 14);
  });

  it("flags habits below 50% this week as at risk", () => {
    // Given: a habit whose 7-day rate is low
    storeMock.habits = [makeHabit({ name: "Stretch" })];
    storeMock.completionRate.mockImplementation((_habit: Habit, days?: number) => (days === 7 ? 0.2 : 0.6));

    render(<AnalyticsView />);

    // Then: the row carries a text badge, not just a colour change
    expect(screen.getByText("At risk")).toBeTruthy();
  });

  it("offers the daily numbers as a table alongside the chart", () => {
    // Given / When: the page renders for the default 30-day range
    storeMock.habits = [makeHabit({ history: { [todayKey()]: true } })];
    render(<AnalyticsView />);

    // Then: the chart has a text equivalent with one row per day
    expect(screen.getByRole("img", { name: "Completion trend" })).toBeTruthy();
    const table = screen.getByRole("table", { hidden: true });
    expect(within(table).getAllByRole("row", { hidden: true })).toHaveLength(31);
  });
});