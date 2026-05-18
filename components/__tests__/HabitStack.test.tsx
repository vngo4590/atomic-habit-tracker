import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Habit } from "@/lib/types";

import { HabitStack } from "@/components/HabitStack";

function makeHabit(id: string, name: string, stackAfterId: string | null = null): Habit {
  return {
    id,
    name,
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

describe("HabitStack", () => {
  it("renders a single habit inside the stack container (no expand button)", () => {
    const habits = [makeHabit("A", "Read")];
    const onCheck = vi.fn();
    const onNavigate = vi.fn();

    render(<HabitStack habits={habits} onCheck={onCheck} onNavigate={onNavigate} />);

    // Then: the habit is shown inside the stack container
    expect(screen.getByText("Read")).toBeTruthy();
    // And: no expand/collapse button because there's only one habit
    expect(screen.queryByText(/more/)).toBeNull();
    expect(screen.queryByText("Collapse")).toBeNull();
  });

  it("shows all habits in a collapsed stack with a +N more badge", () => {
    const habits = [
      makeHabit("A", "Read"),
      makeHabit("B", "Meditate", "A"),
      makeHabit("C", "Journal", "B"),
    ];
    const onCheck = vi.fn();
    const onNavigate = vi.fn();

    render(<HabitStack habits={habits} onCheck={onCheck} onNavigate={onNavigate} />);

    // Then: all habits are in the DOM
    expect(screen.getByText("Read")).toBeTruthy();
    expect(screen.getByText("Meditate")).toBeTruthy();
    expect(screen.getByText("Journal")).toBeTruthy();
    // And: the badge shows +2 more
    expect(screen.getByText("+2 more")).toBeTruthy();
  });

  it("expands the stack when the +N more button is clicked", () => {
    const habits = [
      makeHabit("A", "Read"),
      makeHabit("B", "Meditate", "A"),
      makeHabit("C", "Journal", "B"),
    ];
    const onCheck = vi.fn();
    const onNavigate = vi.fn();

    render(<HabitStack habits={habits} onCheck={onCheck} onNavigate={onNavigate} />);

    // When: the user clicks the expand button
    fireEvent.click(screen.getByText("+2 more"));

    // Then: the collapse button appears
    expect(screen.getByText("Collapse")).toBeTruthy();
    // And: the +N more badge is no longer visible (AnimatePresence exits it)
    const badge = screen.queryByText("+2 more");
    if (badge) {
      expect(badge).toHaveStyle("opacity: 0");
    }
  });

  it("collapses the stack when the Collapse button is clicked", () => {
    const habits = [
      makeHabit("A", "Read"),
      makeHabit("B", "Meditate", "A"),
    ];
    const onCheck = vi.fn();
    const onNavigate = vi.fn();

    render(<HabitStack habits={habits} onCheck={onCheck} onNavigate={onNavigate} />);

    // Given: the stack is expanded
    fireEvent.click(screen.getByText("+1 more"));
    expect(screen.getByText("Collapse")).toBeTruthy();

    // When: the user clicks Collapse
    fireEvent.click(screen.getByText("Collapse"));

    // Then: the +N more badge returns
    expect(screen.getByText("+1 more")).toBeTruthy();
    // And: the collapse button is no longer visible
    const collapseBtn = screen.queryByText("Collapse");
    if (collapseBtn) {
      expect(collapseBtn).toHaveStyle("opacity: 0");
    }
  });

  it("calls onCheck when a habit's check button is clicked", () => {
    const habits = [makeHabit("A", "Read"), makeHabit("B", "Meditate", "A")];
    const onCheck = vi.fn();
    const onNavigate = vi.fn();

    render(<HabitStack habits={habits} onCheck={onCheck} onNavigate={onNavigate} />);

    // When: the user clicks the check button on the front card
    // The front card is rendered first in DOM order
    const checkButtons = screen.getAllByRole("button", { name: "Check" });
    fireEvent.click(checkButtons[0]!);

    // Then: onCheck is called with the front habit
    expect(onCheck).toHaveBeenCalledTimes(1);
    expect(onCheck).toHaveBeenCalledWith(habits[0]);
  });

  it("calls onNavigate when a habit card is clicked", () => {
    const habits = [makeHabit("A", "Read"), makeHabit("B", "Meditate", "A")];
    const onCheck = vi.fn();
    const onNavigate = vi.fn();

    render(<HabitStack habits={habits} onCheck={onCheck} onNavigate={onNavigate} />);

    // When: the user clicks the front card (not the check button)
    const cards = screen.getAllByText("Read");
    // Click the habit name within the card row
    fireEvent.click(cards[0]!.closest("div")!);

    // Then: onNavigate is called
    expect(onNavigate).toHaveBeenCalledWith("A");
  });
});
