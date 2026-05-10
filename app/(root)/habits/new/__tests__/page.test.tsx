import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

describe("NewHabitPage", () => {
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
