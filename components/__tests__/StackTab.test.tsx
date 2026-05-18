import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Habit } from "@/lib/types";

import { StackTab } from "@/components/StackTab";

function makeHabit(id: string, stackAfterId: string | null = null): Habit {
  return {
    id,
    name: `Habit ${id}`,
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
    identity: "tester",
    environment: "",
    schedule: "Daily",
    time: "Morning",
    stackAfterId,
    contract: "",
    contractPartners: [],
    history: {},
    notes: [],
    createdAt: "2030-01-01",
  };
}

afterEach(() => {
  cleanup();
});

describe("StackTab", () => {
  it("shows the current stack chain when the habit is part of a stack", () => {
    const habits = [makeHabit("A"), makeHabit("B", "A"), makeHabit("C", "B")];
    const onUpdate = vi.fn();

    render(<StackTab habit={habits[1]} habits={habits} onUpdateHabit={onUpdate} />);

    // Then: all three habits are shown in the diagram
    expect(screen.getByText("• Habit A")).toBeTruthy();
    expect(screen.getByText("• Habit B")).toBeTruthy();
    expect(screen.getByText("• Habit C")).toBeTruthy();

    // And: a remove button is present
    expect(screen.getByText("Remove from stack")).toBeTruthy();
  });

  it("does not show a stack diagram for a standalone habit", () => {
    const habits = [makeHabit("A"), makeHabit("B")];
    const onUpdate = vi.fn();

    render(<StackTab habit={habits[0]} habits={habits} onUpdateHabit={onUpdate} />);

    // Then: no stack diagram card
    expect(screen.queryByText("Current stack")).toBeNull();
    expect(screen.queryByText("Remove from stack")).toBeNull();
  });

  it("shows a message when there are no other habits to link", () => {
    const habits = [makeHabit("A")];
    const onUpdate = vi.fn();

    render(<StackTab habit={habits[0]} habits={habits} onUpdateHabit={onUpdate} />);

    expect(
      screen.getByText("You need at least one other habit to create a stack."),
    ).toBeTruthy();
  });

  it("links the habit after the selected habit", () => {
    const habits = [makeHabit("A"), makeHabit("B")];
    const onUpdate = vi.fn();

    render(<StackTab habit={habits[1]} habits={habits} onUpdateHabit={onUpdate} />);

    // When: the user selects habit A and clicks Stack habits
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "A" } });
    fireEvent.click(screen.getByText("Stack habits"));

    // Then: B is updated to stack after A
    expect(onUpdate).toHaveBeenCalledWith("B", { stackAfterId: "A" });
  });

  it("re-links a habit when changing stack position", () => {
    // X -> B, user on B's page selects A
    const habits = [makeHabit("X"), makeHabit("B", "X"), makeHabit("A")];
    const onUpdate = vi.fn();

    render(<StackTab habit={habits[1]} habits={habits} onUpdateHabit={onUpdate} />);

    // When: the user selects A and clicks Update stack
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "A" } });
    fireEvent.click(screen.getByText("Update stack"));

    // Then: B now stacks after A
    expect(onUpdate).toHaveBeenCalledWith("B", { stackAfterId: "A" });
  });

  it("shows an info message when already stacked after the selected habit", () => {
    // A -> B, user on B's page selects A
    const habits = [makeHabit("A"), makeHabit("B", "A")];
    const onUpdate = vi.fn();

    render(<StackTab habit={habits[1]} habits={habits} onUpdateHabit={onUpdate} />);

    // When: the user selects A
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "A" } });

    // Then: an info message appears and the button is disabled
    expect(screen.getByText(/already stacked after/i)).toBeTruthy();

    const button = screen.getByRole("button", { name: "Update stack" });
    expect(button).toBeDisabled();
  });

  it("prevents linking when it would create a circular dependency", () => {
    // A -> B, trying to link A after B would create a cycle
    const habits = [makeHabit("A"), makeHabit("B", "A")];
    const onUpdate = vi.fn();

    render(<StackTab habit={habits[0]} habits={habits} onUpdateHabit={onUpdate} />);

    // When: the user selects B
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "B" } });

    // Then: an error message appears and the button is disabled
    expect(screen.getByText(/Linking would create a loop/i)).toBeTruthy();

    const button = screen.getByRole("button", { name: "Update stack" });
    expect(button).toBeDisabled();
  });

  it("removes the habit from its stack when Remove is clicked", () => {
    const habits = [makeHabit("A"), makeHabit("B", "A"), makeHabit("C", "B")];
    const onUpdate = vi.fn();

    render(<StackTab habit={habits[1]} habits={habits} onUpdateHabit={onUpdate} />);

    // When: the user clicks Remove from stack
    fireEvent.click(screen.getByText("Remove from stack"));

    // Then: B is detached and C now stacks after A
    expect(onUpdate).toHaveBeenCalledWith("B", { stackAfterId: null });
    expect(onUpdate).toHaveBeenCalledWith("C", { stackAfterId: "A" });
  });
});
