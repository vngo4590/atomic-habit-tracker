import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StackCardGroup } from "@/components/StackCardGroup";
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

describe("StackCardGroup", () => {
  it("renders a solo habit as a single card", () => {
    const habit = makeHabit("solo");
    render(
      <StackCardGroup
        habit={habit}
        habits={[habit]}
        onCheck={vi.fn()}
        onNavigate={vi.fn()}
        streak={() => 5}
      />,
    );

    expect(screen.getByText("Habit solo")).toBeTruthy();
    expect(screen.queryByText("Collapse stack")).toBeNull();
  });

  it("expands to show next habits when tapped", () => {
    const habits = [makeHabit("root", "a"), makeHabit("a", "b"), makeHabit("b")];
    render(
      <StackCardGroup
        habit={habits[0]}
        habits={habits}
        onCheck={vi.fn()}
        onNavigate={vi.fn()}
        streak={() => 5}
      />,
    );

    fireEvent.click(screen.getByText("Habit root"));
    expect(screen.getByText("Habit a")).toBeTruthy();
    expect(screen.getByText("Collapse stack")).toBeTruthy();
  });

  it("shows overflow indicator when more than 3 habits", () => {
    const habits = [
      makeHabit("a", "b"),
      makeHabit("b", "c"),
      makeHabit("c", "d"),
      makeHabit("d"),
    ];
    render(
      <StackCardGroup
        habit={habits[0]}
        habits={habits}
        onCheck={vi.fn()}
        onNavigate={vi.fn()}
        streak={() => 5}
      />,
    );

    fireEvent.click(screen.getByText("Habit a"));
    expect(screen.getByText("+1 more")).toBeTruthy();
  });

  it("calls onCheck when the check button is clicked", () => {
    const onCheck = vi.fn();
    const habit = makeHabit("solo");
    render(
      <StackCardGroup
        habit={habit}
        habits={[habit]}
        onCheck={onCheck}
        onNavigate={vi.fn()}
        streak={() => 5}
      />,
    );

    fireEvent.click(screen.getByLabelText("Check"));
    expect(onCheck).toHaveBeenCalledWith(expect.objectContaining({ id: "solo" }));
  });
});
