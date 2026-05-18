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
});
