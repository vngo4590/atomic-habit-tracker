import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoopDiagram } from "@/components/LoopDiagram";
import { testHabit } from "@/lib/test/fixtures";

afterEach(() => {
  cleanup();
});

describe("LoopDiagram", () => {
  it("renders the four loop steps as a sentence diagram", () => {
    // Given: a habit with its four loop fields filled in
    const habit = testHabit({
      loopCue: "I open my laptop",
      loopCraving: "to become amazing at AI",
      loopResponse: "read 1 page",
      loopReward: "a visible win",
    });

    // When: the loop diagram renders
    render(<LoopDiagram habit={habit} onUpdate={vi.fn()} />);

    // Then: the intro lede and all four step values are shown
    expect(
      screen.getByText(
        "Every habit follows the same four steps. Here's yours, laid out as a sentence diagram.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("I open my laptop")).toBeTruthy();
    expect(screen.getByText("to become amazing at AI")).toBeTruthy();
    expect(screen.getByText("read 1 page")).toBeTruthy();
    expect(screen.getByText("a visible win")).toBeTruthy();
  });

  it("shows the placeholder copy for an empty loop field", () => {
    // Given: a habit with no cue captured yet
    const habit = testHabit({ loopCue: "" });

    // When: the loop diagram renders
    render(<LoopDiagram habit={habit} onUpdate={vi.fn()} />);

    // Then: the cue cell falls back to its guiding placeholder
    expect(screen.getByText("I pour my morning coffee")).toBeTruthy();
  });

  it("no longer renders the removed 'loop in a sentence' recap", () => {
    // Given: a fully filled habit
    const habit = testHabit({
      loopCue: "I open my laptop",
      loopCraving: "to become a reader",
      loopResponse: "read one page",
      loopReward: "a visible win",
    });

    // When: the loop diagram renders
    render(<LoopDiagram habit={habit} onUpdate={vi.fn()} />);

    // Then: the recap card and its heading are gone
    expect(screen.queryByText("The loop in a sentence")).toBeNull();
  });
});
