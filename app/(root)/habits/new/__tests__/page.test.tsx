import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Habit } from "@/lib/types";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

const storeMock = vi.hoisted(() => ({
  habits: [] as Habit[],
  formationVerdicts: [] as Array<{ habitId: string; formed: boolean }>,
  identity: { statement: "", values: [] as string[] },
  addHabit: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

import NewHabitPage from "@/app/(root)/habits/new/page";

afterEach(() => {
  cleanup();
});

describe("NewHabitPage", () => {
  it("renders all seven day-of-week toggle buttons", () => {
    render(<NewHabitPage />);

    // Then: every day abbreviation is present as a toggle button
    expect(screen.getByRole("button", { name: "Sun" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tue" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Wed" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Thu" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fri" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sat" })).toBeTruthy();
  });

  
  it("renders a legend explaining scheduled vs off day pills", () => {
    // Given: the create-habit page mounted
    render(<NewHabitPage />);

    // Then: the day-selector legend is present with both states labelled
    expect(screen.getByLabelText("Day selector legend")).toBeTruthy();
    expect(screen.getByText("Scheduled")).toBeTruthy();
    expect(screen.getByText("Off")).toBeTruthy();
  });

  it("renders no select elements (the cue connector dropdown was removed)", () => {
    // Given: the new habit page — the cue is now a single free-text blank and
    // the Time block control was removed earlier, so no <select> remains
    const { container } = render(<NewHabitPage />);

    // When: looking for <select> elements in the page
    const selects = container.querySelectorAll("select");

    // Then: there are none, and no Time block exists
    expect(selects.length).toBe(0);
    expect(screen.queryByText("Time block")).toBeNull();
  });

  it("stores the cue exactly as the user typed it, including the connector", () => {
    // Given: a fresh page with the action, cue and identity blanks filled,
    // where the user typed the whole cue clause ("after I pour my coffee")
    storeMock.habits = [];
    storeMock.addHabit.mockClear();
    render(<NewHabitPage />);
    fireEvent.change(screen.getByPlaceholderText("read one page"), { target: { value: "read one page" } });
    fireEvent.change(screen.getByPlaceholderText("after I pour my coffee"), {
      target: { value: "after I pour my coffee" },
    });
    fireEvent.change(screen.getByPlaceholderText("a reader"), { target: { value: "a reader" } });

    // When: the user submits
    fireEvent.click(screen.getByRole("button", { name: "Create habit" }));

    // Then: the synthesised law cue leads with the typed connector (not doubled)
    expect(storeMock.addHabit).toHaveBeenCalledTimes(1);
    const created = storeMock.addHabit.mock.calls[0][0];
    expect(created.cue).toBe("After I pour my coffee.");
    // And: the loop cue stores the full clause so the summary reads it back
    expect(created.loopCue).toBe("after I pour my coffee");
  });

  it("supplies a 'when' for a bare cue that lacks a connector", () => {
    // Given: a user who typed only the bare cue clause
    storeMock.habits = [];
    storeMock.addHabit.mockClear();
    render(<NewHabitPage />);
    fireEvent.change(screen.getByPlaceholderText("read one page"), { target: { value: "read one page" } });
    fireEvent.change(screen.getByPlaceholderText("after I pour my coffee"), {
      target: { value: "I pour my coffee" },
    });
    fireEvent.change(screen.getByPlaceholderText("a reader"), { target: { value: "a reader" } });

    // When: the user submits
    fireEvent.click(screen.getByRole("button", { name: "Create habit" }));

    // Then: the law cue gets a leading "when" while loopCue stays bare
    const created = storeMock.addHabit.mock.calls[0][0];
    expect(created.cue).toBe("When I pour my coffee.");
    expect(created.loopCue).toBe("I pour my coffee");
  });

  it("shows habit-derived identities as chips but excludes core values from the Identity page", () => {
    // Given: a profile with core values and habits with their own identities
    storeMock.identity = { statement: "I am disciplined.", values: ["Discipline", "Health"] };
    storeMock.habits = [
      { id: "h1", name: "Read", identity: "a reader" },
      { id: "h2", name: "Run", identity: "a runner" },
    ] as Habit[];

    // When: the new habit page renders
    render(<NewHabitPage />);

    // Then: habit-derived identity chips are visible
    const chips = Array.from(document.querySelectorAll(".identity-chip")).map((el) => el.textContent);
    expect(chips).toContain("a reader");
    expect(chips).toContain("a runner");

    // And: core values from the Identity page are NOT shown as chips
    expect(chips).not.toContain("Discipline");
    expect(chips).not.toContain("Health");
  });

  it("only shows the top 5 most-used identities by default", () => {
    // Given: 6 habits with different identities, where "a reader" appears most
    storeMock.habits = [
      { id: "h1", name: "Read", identity: "a reader" },
      { id: "h2", name: "Read 2", identity: "a reader" },
      { id: "h3", name: "Run", identity: "a runner" },
      { id: "h4", name: "Meditate", identity: "mindful" },
      { id: "h5", name: "Write", identity: "writer" },
      { id: "h6", name: "Lift", identity: "athlete" },
      { id: "h7", name: "Sleep", identity: "rested" },
    ] as Habit[];

    render(<NewHabitPage />);

    // Then: only 5 chips are shown (top 5 by frequency)
    const chips = Array.from(document.querySelectorAll(".identity-chip")).map((el) => el.textContent);
    expect(chips).toHaveLength(5);
    // "a reader" appears twice so it should be first
    expect(chips[0]).toBe("a reader");
    // "rested" appears once and is last among the top 5
    expect(chips).toContain("a runner");
    expect(chips).toContain("mindful");
    expect(chips).toContain("writer");
    expect(chips).toContain("athlete");
    expect(chips).not.toContain("rested");
  });

  it("filters identity chips when typing in the identity input", () => {
    // Given: habits with various identities
    storeMock.habits = [
      { id: "h1", name: "Read", identity: "a reader" },
      { id: "h2", name: "Run", identity: "a runner" },
      { id: "h3", name: "Write", identity: "writer" },
    ] as Habit[];

    render(<NewHabitPage />);

    // When: the user types "run" in the identity input
    fireEvent.change(screen.getByPlaceholderText("a reader"), { target: { value: "run" } });

    // Then: only matching chips are shown (case-insensitive)
    const chips = Array.from(document.querySelectorAll(".identity-chip")).map((el) => el.textContent);
    expect(chips).toContain("a runner");
    expect(chips).not.toContain("a reader");
    expect(chips).not.toContain("writer");
  });

  it("shows no chips when the typed identity does not match any existing one", () => {
    storeMock.habits = [
      { id: "h1", name: "Read", identity: "a reader" },
      { id: "h2", name: "Run", identity: "a runner" },
    ] as Habit[];

    render(<NewHabitPage />);

    // When: the user types a brand-new identity
    fireEvent.change(screen.getByPlaceholderText("a reader"), { target: { value: "pilot" } });

    // Then: the chip area is empty, implying a new identity
    const chips = document.querySelectorAll(".identity-chip");
    expect(chips.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Active-habit cap UX
  // -------------------------------------------------------------------------
  it("disables submission and explains the cap when the user has 3 active habits", () => {
    // Given: exactly three active (non-inducted) habits
    storeMock.habits = [
      { id: "h1", name: "Read", identity: "a reader" },
      { id: "h2", name: "Run", identity: "a runner" },
      { id: "h3", name: "Write", identity: "a writer" },
    ] as Habit[];
    storeMock.formationVerdicts = [];
    storeMock.addHabit.mockClear();
    render(<NewHabitPage />);

    // Fill the required fields so only the cap can be blocking submission.
    fireEvent.change(screen.getByPlaceholderText("read one page"), { target: { value: "meditate" } });
    fireEvent.change(screen.getByPlaceholderText("a reader"), { target: { value: "calm" } });

    // Then: the cap message and a HelpTip explaining the mechanic are shown
    expect(screen.getByText(/reached the maximum of 3 active habits/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Why can't I add a habit?" })).toBeTruthy();

    // And: the Create button is disabled and clicking it does nothing
    const createButton = screen.getByRole("button", { name: "Create habit" }) as HTMLButtonElement;
    expect(createButton.disabled).toBe(true);
    fireEvent.click(createButton);
    expect(storeMock.addHabit).not.toHaveBeenCalled();
  });

  it("keeps submission available when one of three habits is inducted (frees a slot)", () => {
    // Given: three habits where one is inducted into the Hall of Fame
    storeMock.habits = [
      { id: "h1", name: "Read", identity: "a reader" },
      { id: "h2", name: "Run", identity: "a runner" },
      { id: "h3", name: "Write", identity: "a writer" },
    ] as Habit[];
    storeMock.formationVerdicts = [{ habitId: "h2", formed: true }];
    storeMock.addHabit.mockClear();
    render(<NewHabitPage />);

    // Fill the required fields
    fireEvent.change(screen.getByPlaceholderText("read one page"), { target: { value: "meditate" } });
    fireEvent.change(screen.getByPlaceholderText("a reader"), { target: { value: "calm" } });

    // Then: there is no cap message and the Create button is enabled
    expect(screen.queryByText(/reached the maximum of 3 active habits/i)).toBeNull();
    const createButton = screen.getByRole("button", { name: "Create habit" }) as HTMLButtonElement;
    expect(createButton.disabled).toBe(false);

    // And: submitting actually creates the habit
    fireEvent.click(createButton);
    expect(storeMock.addHabit).toHaveBeenCalledTimes(1);
  });
});
