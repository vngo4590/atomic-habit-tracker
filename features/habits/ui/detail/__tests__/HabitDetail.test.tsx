import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dateAdd, todayKey } from "@/lib/helpers";
import type { FormationVerdict, Habit } from "@/lib/types";

const routerMock = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn() }));

const storeMock = vi.hoisted(() => ({
  habits: [] as Habit[],
  formationVerdicts: [] as FormationVerdict[],
  streak: vi.fn(() => 4),
  longestStreak: vi.fn(() => 9),
  completionRate: vi.fn(() => 0.5),
  toggleHabit: vi.fn(),
  deleteHabit: vi.fn(),
  updateHabit: vi.fn(),
  logCheckIn: vi.fn(),
  applyStackMutation: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "habit_1" }),
  useRouter: () => routerMock,
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

import { HabitDetail } from "../HabitDetail";

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
    identity: "a reader",
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  storeMock.formationVerdicts = [];
});

describe("HabitDetail", () => {
  it("shows the habit's stats and how far it is toward its formation review", () => {
    // Given: a 10-day-old habit with three check-ins
    const today = todayKey();
    storeMock.habits = [
      makeHabit({
        createdAt: dateAdd(today, -10),
        history: { [today]: true, [dateAdd(today, -1)]: true, [dateAdd(today, -2)]: true },
      }),
    ];

    // When: the detail page renders
    render(<HabitDetail />);

    // Then: the stat grid and formation progress are shown
    expect(screen.getByText("Total check-ins").nextElementSibling?.textContent).toBe("3");
    expect(screen.getByText("4d")).toBeTruthy();
    expect(screen.getByText("9d")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText("Day 10 of 66")).toBeTruthy();
  });

  it("shows the formation verdict once the habit has been reviewed", () => {
    // Given: a habit the user judged as formed
    storeMock.habits = [makeHabit()];
    storeMock.formationVerdicts = [
      { habitId: "habit_1", score: 5, reflection: "", formed: true, reviewedAt: todayKey() },
    ];

    // When: the detail page renders
    render(<HabitDetail />);

    // Then: the verdict links to the Hall of Fame
    expect(screen.getByText("Formed — in the Hall of Fame")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Hall of Fame" }).getAttribute("href")).toBe("/hall-of-fame");
  });

  it("switches to the History tab and loads it on demand", async () => {
    // Given: the detail page on its default Overview tab
    storeMock.habits = [makeHabit()];
    render(<HabitDetail />);
    expect(screen.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected")).toBe("true");

    // When: the user opens History
    fireEvent.click(screen.getByRole("tab", { name: "History" }));

    // Then: History is selected and the overview content is gone
    expect(screen.getByRole("tab", { name: "History" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByRole("button", { name: "Define the 4 laws" })).toBeNull();
    expect(await screen.findByRole("button", { name: "This week" })).toBeTruthy();
  });

  it("deletes only after the user confirms, then returns to the library", () => {
    // Given: the detail page
    storeMock.habits = [makeHabit()];
    render(<HabitDetail />);

    // When: the user asks to delete, cancels, then deletes for real
    fireEvent.click(screen.getByRole("button", { name: "Delete habit" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(storeMock.deleteHabit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete habit" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    // Then: the habit is deleted and the user lands on /habits
    expect(storeMock.deleteHabit).toHaveBeenCalledWith("habit_1");
    expect(routerMock.push).toHaveBeenCalledWith("/habits");
  });

  it("cancelling an edit saves nothing and brings the stats back", () => {
    // Given: the edit panel is open
    storeMock.habits = [makeHabit()];
    render(<HabitDetail />);
    fireEvent.click(screen.getByRole("button", { name: "Edit habit" }));
    expect(screen.queryByText("Total check-ins")).toBeNull();

    // When: the user cancels
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Then: nothing was patched and the stats are visible again
    expect(storeMock.updateHabit).not.toHaveBeenCalled();
    expect(screen.getByText("Total check-ins")).toBeTruthy();
  });

  it("blocks saving an edit with an empty name and says why", () => {
    // Given: the edit panel is open
    storeMock.habits = [makeHabit()];
    render(<HabitDetail />);
    fireEvent.click(screen.getByRole("button", { name: "Edit habit" }));

    // When: the user clears the name
    fireEvent.change(screen.getByDisplayValue("Read"), { target: { value: "  " } });

    // Then: Save is disabled and the error sits next to the field
    expect((screen.getByRole("button", { name: "Save changes" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("Give the habit a name.");
  });

  it("invites the user to add an accountability contract when there is none", () => {
    // Given: a habit without a contract
    storeMock.habits = [makeHabit()];

    // When: the detail page renders
    render(<HabitDetail />);

    // Then: the contract card explains what it is for
    expect(screen.getByText("Add a real cost to skipping. Invite a witness or write the terms.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add" })).toBeTruthy();
  });

  it("shows a not-found state with a way back for an unknown habit", () => {
    // Given: the habit id doesn't exist
    storeMock.habits = [];

    // When: the detail page renders
    render(<HabitDetail />);

    // Then: the user is told and can go back
    expect(screen.getByRole("heading", { name: "Habit not found." })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(routerMock.back).toHaveBeenCalled();
  });
});
