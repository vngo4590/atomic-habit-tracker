import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StackDiagram } from "@/components/StackDiagram";
import type { Habit } from "@/lib/types";

function makeHabit(id: string, stackNextId?: string | null): Habit {
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
    stackNextId: stackNextId ?? null,
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

describe("StackDiagram", () => {
  it("shows empty state for a solo habit", () => {
    const habit = makeHabit("solo");
    render(<StackDiagram habit={habit} habits={[habit]} onUpdate={vi.fn()} />);

    expect(screen.getByText("This habit is not part of a stack.")).toBeTruthy();
  });

  it("renders the chain with position label", () => {
    const habits = [makeHabit("root", "a"), makeHabit("a", "b"), makeHabit("b")];
    render(<StackDiagram habit={habits[1]} habits={habits} onUpdate={vi.fn()} />);

    expect(screen.getByText("Step 2 of 3")).toBeTruthy();
    expect(screen.getByText("Habit root")).toBeTruthy();
    expect(screen.getByText("Habit a")).toBeTruthy();
    expect(screen.getByText("Habit b")).toBeTruthy();
  });

  it("calls onUpdate when linking after another habit", () => {
    const onUpdate = vi.fn();
    const habits = [makeHabit("a"), makeHabit("b")];
    render(<StackDiagram habit={habits[0]} habits={habits} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByText("Link after…"));
    fireEvent.click(screen.getByText("Habit b"));

    // Linking a after b means b -> a
    expect(onUpdate).toHaveBeenCalledWith("b", { stackNextId: "a" });
  });

  it("cancels link mode when Cancel is clicked", () => {
    const onUpdate = vi.fn();
    const habits = [makeHabit("a"), makeHabit("b")];
    render(<StackDiagram habit={habits[0]} habits={habits} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByText("Link after…"));
    expect(screen.getByText("Cancel")).toBeTruthy();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Cancel")).toBeNull();
  });

  it("calls onUpdate when removing from stack", () => {
    const onUpdate = vi.fn();
    const habits = [makeHabit("root", "a"), makeHabit("a")];
    render(<StackDiagram habit={habits[1]} habits={habits} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByText("Remove from stack"));

    expect(onUpdate).toHaveBeenCalledWith("root", { stackNextId: null });
    expect(onUpdate).toHaveBeenCalledWith("a", { stackNextId: null });
  });
});
