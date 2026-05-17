import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

describe("HabitRow animation safety", () => {
  it("renders without crashing when not done", () => {
    const habit = makeHabit();
    render(
      <HabitRow
        habit={habit}
        done={false}
        streak={0}
        onCheck={vi.fn()}
        onOpen={vi.fn()}
      />
    );
    expect(screen.queryAllByText("Read 10 pages").length).toBeGreaterThan(0);
  });

  it("renders without crashing when done (triggers scale animation)", () => {
    const habit = makeHabit();
    render(
      <HabitRow
        habit={habit}
        done={true}
        streak={5}
        onCheck={vi.fn()}
        onOpen={vi.fn()}
      />
    );
    expect(screen.queryAllByText("Read 10 pages").length).toBeGreaterThan(0);
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("rerenders from undone to done without crashing", () => {
    const habit = makeHabit();
    const { rerender } = render(
      <HabitRow
        habit={habit}
        done={false}
        streak={0}
        onCheck={vi.fn()}
        onOpen={vi.fn()}
      />
    );

    expect(screen.queryAllByText("Read 10 pages").length).toBeGreaterThan(0);

    rerender(
      <HabitRow
        habit={habit}
        done={true}
        streak={1}
        onCheck={vi.fn()}
        onOpen={vi.fn()}
      />
    );

    expect(screen.queryAllByText("Read 10 pages").length).toBeGreaterThan(0);
  });
});
