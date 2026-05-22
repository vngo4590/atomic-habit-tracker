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
    // Solo habit has no peek slivers and no "+N more" indicator.
    expect(screen.queryAllByTestId("stack-card-peek")).toHaveLength(0);
    expect(screen.queryByTestId("stack-card-more")).toBeNull();
  });

  it("collapsed wallet view shows the top card plus up to 2 peek slivers", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b", "c"), makeHabit("c")];
    render(
      <StackCardGroup
        habit={habits[0]}
        habits={habits}
        onCheck={vi.fn()}
        onNavigate={vi.fn()}
        streak={() => 5}
      />,
    );

    // Top card visible, peek slivers behind it, expanded chain not yet visible.
    expect(screen.getByText("Habit a")).toBeTruthy();
    expect(screen.getAllByTestId("stack-card-peek")).toHaveLength(2);
    expect(screen.queryByText("Habit b")).toBeNull();
    expect(screen.queryByText("Collapse stack")).toBeNull();
  });

  it("collapsed wallet view caps peek slivers at 2 even on long chains", () => {
    const habits = [
      makeHabit("a", "b"),
      makeHabit("b", "c"),
      makeHabit("c", "d"),
      makeHabit("d", "e"),
      makeHabit("e"),
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
    expect(screen.getAllByTestId("stack-card-peek")).toHaveLength(2);
    expect(screen.getByTestId("stack-card-more").textContent).toMatch(/\+4 more/);
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
    expect(screen.getByText("Habit b")).toBeTruthy();
    expect(screen.getByText("Collapse stack")).toBeTruthy();
  });

  it("expanded view shows top + at most 2 upcoming cards with +N more excluding the displayed", () => {
    // Chain of 5: a -> b -> c -> d -> e. Expanded shows a/b/c with "+2 more".
    const habits = [
      makeHabit("a", "b"),
      makeHabit("b", "c"),
      makeHabit("c", "d"),
      makeHabit("d", "e"),
      makeHabit("e"),
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
    expect(screen.getByText("Habit a")).toBeTruthy();
    expect(screen.getByText("Habit b")).toBeTruthy();
    expect(screen.getByText("Habit c")).toBeTruthy();
    expect(screen.queryByText("Habit d")).toBeNull();
    expect(screen.queryByText("Habit e")).toBeNull();
    expect(screen.getByTestId("stack-card-more").textContent).toMatch(/\+2 more/);
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
    expect(screen.getByTestId("stack-card-more").textContent).toMatch(/\+1 more/);
  });

  it("uses the visible habit as the top card (sub-chain), not the chain root", () => {
    // Full chain a -> b -> c -> d. Pass `b` as the visible habit. Wallet
    // should show b/c/d, not include a.
    const habits = [
      makeHabit("a", "b"),
      makeHabit("b", "c"),
      makeHabit("c", "d"),
      makeHabit("d"),
    ];
    render(
      <StackCardGroup
        habit={habits[1]}
        habits={habits}
        onCheck={vi.fn()}
        onNavigate={vi.fn()}
        streak={() => 5}
      />,
    );
    // Collapsed top is b; no peek includes a.
    expect(screen.getByText("Habit b")).toBeTruthy();
    expect(screen.queryByText("Habit a")).toBeNull();
  });

  it("filters out already-done upcoming habits from the wallet", () => {
    const habits = [
      { ...makeHabit("a", "b"), history: {} },
      { ...makeHabit("b", "c"), history: { "2030-01-01": { done: true } } as Habit["history"] },
      makeHabit("c"),
    ];
    render(
      <StackCardGroup
        habit={habits[0]}
        habits={habits}
        onCheck={vi.fn()}
        onNavigate={vi.fn()}
        streak={() => 5}
        today="2030-01-01"
      />,
    );
    // Top is a, upcoming filtered to [a, c] — b is hidden because done.
    fireEvent.click(screen.getByText("Habit a"));
    expect(screen.getByText("Habit a")).toBeTruthy();
    expect(screen.queryByText("Habit b")).toBeNull();
    expect(screen.getByText("Habit c")).toBeTruthy();
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
