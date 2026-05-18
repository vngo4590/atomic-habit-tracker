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

  it("allows linking the habit after another habit", () => {
    const habits = [makeHabit("A"), makeHabit("B")];
    const onUpdate = vi.fn();

    render(<StackTab habit={habits[1]} habits={habits} onUpdateHabit={onUpdate} />);

    // When: the user selects habit A and clicks Link habits
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "A" } });
    fireEvent.click(screen.getByText("Link habits"));

    // Then: B is updated to stack after A
    expect(onUpdate).toHaveBeenCalledWith("B", { stackAfterId: "A" });
  });

  it("allows linking the habit before another habit", () => {
    const habits = [makeHabit("A"), makeHabit("B", "A"), makeHabit("C")];
    const onUpdate = vi.fn();

    render(<StackTab habit={habits[2]} habits={habits} onUpdateHabit={onUpdate} />);

    // When: the user selects habit B, chooses Before, and clicks Link
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "B" } });
    fireEvent.click(screen.getByText("Before"));
    fireEvent.click(screen.getByText("Link habits"));

    // Then: C stacks after A (B's former predecessor), and B stacks after C
    expect(onUpdate).toHaveBeenCalledWith("C", { stackAfterId: "A" });
    expect(onUpdate).toHaveBeenCalledWith("B", { stackAfterId: "C" });
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

  it("auto-corrects and warns when existing data has a multi-successor conflict", () => {
    // Corrupted state: both B and C already point to A (A has two successors)
    const habits = [makeHabit("A"), makeHabit("B", "A"), makeHabit("C", "A"), makeHabit("D")];
    const onUpdate = vi.fn();

    render(<StackTab habit={habits[3]} habits={habits} onUpdateHabit={onUpdate} />);

    // When: the user links D after A
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "A" } });
    fireEvent.click(screen.getByText("Link habits"));

    // Then: the patches include a corrective detachment for the extra successor
    const calls = onUpdate.mock.calls;
    const detachedId = calls.find(([, patch]) => patch.stackAfterId === null)?.[0];
    expect(detachedId).toBeTruthy();

    // And: a warning message is shown to the user
    expect(screen.getByText(/removed from the stack after/i)).toBeTruthy();
  });
});
