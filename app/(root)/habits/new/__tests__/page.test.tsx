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
    const chips = Array.from(document.querySelectorAll(".chip")).map((el) => el.textContent);
    expect(chips).toContain("a reader");
    expect(chips).toContain("a runner");

    // And: core values from the Identity page are NOT shown as chips
    expect(chips).not.toContain("Discipline");
    expect(chips).not.toContain("Health");
  });
});
