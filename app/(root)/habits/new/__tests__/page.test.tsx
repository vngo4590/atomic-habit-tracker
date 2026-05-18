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

  it("keeps custom sentence time blocks visible in the time block selector", () => {
    const { container } = render(<NewHabitPage />);
    const timeSelect = container.querySelector("select") as HTMLSelectElement;

    fireEvent.change(screen.getByPlaceholderText("Morning"), { target: { value: "Lunch break" } });

    expect(timeSelect.value).toBe("Custom");
    expect(screen.getAllByDisplayValue("Lunch break")).toHaveLength(2);

    fireEvent.change(timeSelect, { target: { value: "Evening" } });

    expect((screen.getByPlaceholderText("Morning") as HTMLInputElement).value).toBe("Evening");
    expect(timeSelect.value).toBe("Evening");
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
