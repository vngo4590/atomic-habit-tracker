import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Habit } from "@/lib/types";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

const storeMock = vi.hoisted(() => ({
  habits: [] as Habit[],
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

  it("renders only the cue-connector select (no time-block selector) under the Schedule section", () => {
    // Given: the new habit page (the Time block control was removed in PR1;
    // the only <select> is the inline cue-connector dropdown)
    const { container } = render(<NewHabitPage />);

    // When: looking for <select> elements in the page
    const selects = container.querySelectorAll("select");

    // Then: the only select is the cue connector, and no Time block exists
    expect(selects.length).toBe(1);
    expect(selects[0].getAttribute("aria-label")).toBe("Cue connector");
    expect(screen.queryByText("Time block")).toBeNull();
  });

  it("stores the chosen connector as the leading word of the law cue", () => {
    // Given: a fresh page with the action, cue and identity blanks filled
    storeMock.habits = [];
    storeMock.addHabit.mockClear();
    render(<NewHabitPage />);
    fireEvent.change(screen.getByPlaceholderText("read one page"), { target: { value: "read one page" } });
    fireEvent.change(screen.getByPlaceholderText("I pour my coffee"), { target: { value: "I pour my coffee" } });
    fireEvent.change(screen.getByPlaceholderText("a reader"), { target: { value: "a reader" } });

    // When: the user picks "Before" from the connector dropdown and submits
    fireEvent.change(screen.getByLabelText("Cue connector"), { target: { value: "Before" } });
    fireEvent.click(screen.getByRole("button", { name: "Create habit" }));

    // Then: the synthesised law cue leads with the chosen connector
    expect(storeMock.addHabit).toHaveBeenCalledTimes(1);
    const created = storeMock.addHabit.mock.calls[0][0];
    expect(created.cue).toBe("Before I pour my coffee.");
    // And: the loop cue stays the bare phrase the diagram expects
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
});
