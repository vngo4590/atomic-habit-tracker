import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HabitRow } from "@/components/HabitRow";
import type { Habit } from "@/lib/types";

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    name: "Read 10 pages",
    emoji: "📖",
    identity: "a reader",
    time: "Morning",
    schedule: "Every day",
    cue: "After I pour coffee",
    response: "Read 10 pages",
    twoMin: "Open the book",
    craving: "Become a reader",
    reward: "One visible win",
    environment: "Kitchen table",
    contract: "",
    contractPartners: [],
    notes: [],
    createdAt: "2024-01-01",
    history: {},
    loopCue: "",
    loopCraving: "",
    loopResponse: "",
    loopReward: "",
    ...overrides,
  };
}

describe("HabitRow business logic", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows name, cue, identity, no checkmark, and no streak when habit is not done", () => {
    // Given a habit that has not been checked in today
    const habit = makeHabit();
    const onCheck = vi.fn();
    const onOpen = vi.fn();

    // When the row is rendered
    const { container } = render(
      <HabitRow habit={habit} done={false} streak={0} onCheck={onCheck} onOpen={onOpen} />,
    );

    // Then the habit name, cue, and identity are visible
    expect(screen.getByText("Read 10 pages")).toBeTruthy();
    expect(screen.getByText("After I pour coffee")).toBeTruthy();
    expect(screen.getAllByText("a reader").length).toBeGreaterThanOrEqual(1);

    // And the row does not have the done styling class
    expect(container.querySelector(".habit-row")?.classList.contains("done")).toBe(false);

    // And the check button does not have the done class
    expect(container.querySelector(".check")?.classList.contains("done")).toBe(false);

    // And no streak pill is shown
    expect(container.querySelector(".streak-pill")).toBeNull();
  });

  it("shows checkmark, crossed-out name, streak pill, and identity chip with +1 when habit is done", () => {
    // Given a habit that has been checked in today with a streak
    const habit = makeHabit();
    const onCheck = vi.fn();
    const onOpen = vi.fn();

    // When the row is rendered as done
    const { container } = render(
      <HabitRow habit={habit} done={true} streak={5} onCheck={onCheck} onOpen={onOpen} />,
    );

    // Then the row has the done styling class
    expect(container.querySelector(".habit-row")?.classList.contains("done")).toBe(true);

    // And the check button has the done class
    expect(container.querySelector(".check")?.classList.contains("done")).toBe(true);

    // And the streak pill is visible with the streak count
    expect(container.querySelector(".streak-pill")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();

    // And the identity chip shows +1
    expect(screen.getByText("+1")).toBeTruthy();
  });

  it("truncates a long cue to 40 characters", () => {
    // Given a habit with a cue longer than 40 characters
    const longCue = "After I pour coffee and eat breakfast and read the news";
    const habit = makeHabit({ cue: longCue });

    // When the row is rendered
    render(<HabitRow habit={habit} done={false} streak={0} onCheck={vi.fn()} onOpen={vi.fn()} />);

    // Then only the first 40 characters of the cue are shown
    expect(screen.getByText(longCue.slice(0, 40))).toBeTruthy();
    expect(screen.queryByText(longCue)).toBeNull();
  });

  it("hides the streak pill when the streak is 0", () => {
    // Given a habit with zero streak
    const habit = makeHabit();

    // When the row is rendered
    const { container } = render(
      <HabitRow habit={habit} done={false} streak={0} onCheck={vi.fn()} onOpen={vi.fn()} />,
    );

    // Then no streak pill is present in the DOM
    expect(container.querySelector(".streak-pill")).toBeNull();
  });

  it("shows the streak pill with a flame icon when the streak is 1 or more", () => {
    // Given a habit with a positive streak
    const habit = makeHabit();

    // When the row is rendered with streak of 1
    const { container, rerender } = render(
      <HabitRow habit={habit} done={true} streak={1} onCheck={vi.fn()} onOpen={vi.fn()} />,
    );

    // Then the streak pill is visible
    expect(container.querySelector(".streak-pill")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();

    // When the streak increases to 3
    rerender(<HabitRow habit={habit} done={true} streak={3} onCheck={vi.fn()} onOpen={vi.fn()} />);

    // Then the updated streak count is shown
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("calls onOpen when the row is clicked", () => {
    // Given a rendered habit row
    const habit = makeHabit();
    const onCheck = vi.fn();
    const onOpen = vi.fn();

    const { container } = render(
      <HabitRow habit={habit} done={false} streak={0} onCheck={onCheck} onOpen={onOpen} />,
    );

    // When the user clicks the row
    fireEvent.click(container.querySelector(".habit-row")!);

    // Then onOpen is called exactly once
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onCheck).not.toHaveBeenCalled();
  });

  it("calls onCheck and stops propagation when the check button is clicked", () => {
    // Given a rendered habit row
    const habit = makeHabit();
    const onCheck = vi.fn();
    const onOpen = vi.fn();

    const { container } = render(
      <HabitRow habit={habit} done={false} streak={0} onCheck={onCheck} onOpen={onOpen} />,
    );

    // When the user clicks the check button
    fireEvent.click(container.querySelector(".check")!);

    // Then onCheck is called exactly once
    expect(onCheck).toHaveBeenCalledTimes(1);

    // And onOpen is not called because propagation was stopped
    expect(onOpen).not.toHaveBeenCalled();
  });
});
