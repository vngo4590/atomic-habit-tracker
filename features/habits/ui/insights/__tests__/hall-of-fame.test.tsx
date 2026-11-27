import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dateAdd, todayKey } from "@/lib/helpers";
import type { FormationVerdict, Habit } from "@/lib/types";

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
    createdAt: todayKey(),
    ...patch,
  };
}

const storeMock = vi.hoisted(() => ({
  habits: [] as Habit[],
  streak: vi.fn((habit: Habit) => (habit.history[todayKey()] ? 1 : 0)),
  longestStreak: vi.fn(() => 1),
  completionRate: vi.fn((habit: Habit) => (habit.history[todayKey()] ? 1 : 0)),
  formationVerdicts: [] as FormationVerdict[],
  saveFormationVerdict: vi.fn(),
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

// The questionnaire is lazy-loaded via next/dynamic; render a stub synchronously.
vi.mock("next/dynamic", () => ({
  default: () =>
    function QuestionnaireStub({ habit }: { habit: Habit }) {
      return <div role="dialog" aria-label={`Review ${habit.name}`} />;
    },
}));

import { HallOfFameView } from "../HallOfFameView";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  storeMock.habits = [];
  storeMock.formationVerdicts = [];
});

describe("HallOfFameView", () => {
  it("shows in-progress task metrics from current habit history", () => {
    // Given: a new habit checked in today
    storeMock.habits = [makeHabit({ history: { [todayKey()]: true } })];

    render(<HallOfFameView />);

    // Then: today's status, active streak and 30-day rate are shown as text
    expect(screen.getByText("Done today")).toBeTruthy();
    expect(screen.getByText("1d active")).toBeTruthy();
    expect(screen.getByText("100% 30-day")).toBeTruthy();
  });

  it("exposes formation progress as an accessible progress bar", () => {
    // Given: a habit started 33 days ago
    storeMock.habits = [makeHabit({ name: "Run", createdAt: dateAdd(todayKey(), -33) })];

    render(<HallOfFameView />);

    // Then: the bar reports 33 of 66 days
    const bar = screen.getByRole("progressbar", { name: "Run formation progress" });
    expect(bar.getAttribute("aria-valuenow")).toBe("50");
    expect(bar.getAttribute("aria-valuetext")).toBe("33 of 66 days");
    expect(screen.getByText("33 / 66 days")).toBeTruthy();
  });

  it("explains how induction works when nothing is inducted yet", () => {
    // Given: no habits or verdicts
    render(<HallOfFameView />);

    // Then: the empty state explains the 66-day review and offers a next step
    const inducted = within(screen.getByRole("region", { name: "Inducted" }));
    expect(inducted.getByRole("heading", { name: "No inducted habits yet" })).toBeTruthy();
    expect(inducted.getByText(/After 66 days a habit becomes ready for review/)).toBeTruthy();
    expect(inducted.getByRole("link", { name: "Keep checking in" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Ready for review" })).toBeNull();
  });

  it("lists habits past 66 days for review and opens the questionnaire", () => {
    // Given: a 70-day-old habit with no verdict
    storeMock.habits = [makeHabit({ id: "old", name: "Floss", createdAt: dateAdd(todayKey(), -70) })];

    render(<HallOfFameView />);

    // When: the user starts the review
    const ready = within(screen.getByRole("region", { name: "Ready for review" }));
    expect(ready.getByText(/70 days/)).toBeTruthy();
    fireEvent.click(ready.getByRole("button", { name: "Review Floss" }));

    // Then: the questionnaire opens for that habit
    expect(screen.getByRole("dialog", { name: "Review Floss" })).toBeTruthy();
  });

  it("shows inducted habits as cards with score, best streak and adherence", () => {
    // Given: a habit with a formed verdict
    storeMock.habits = [makeHabit({ id: "h", name: "Meditate", createdAt: dateAdd(todayKey(), -80) })];
    storeMock.formationVerdicts = [{ habitId: "h", formed: true, score: 4 } as FormationVerdict];
    storeMock.longestStreak.mockReturnValue(40);

    render(<HallOfFameView />);

    // Then: it is inducted (not awaiting review) with its stats
    const inducted = within(screen.getByRole("region", { name: "Inducted" }));
    expect(inducted.getByRole("heading", { name: "Meditate" })).toBeTruthy();
    expect(inducted.getByText("4")).toBeTruthy();
    expect(inducted.getByText("40d")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Ready for review" })).toBeNull();
  });
});