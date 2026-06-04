import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoopDiagram } from "@/components/LoopDiagram";
import { testHabit } from "@/lib/test/fixtures";

afterEach(() => {
  cleanup();
});

describe("LoopDiagram recap sentence", () => {
  it("reads grammatically for a habit created with bare loop phrases", () => {
    // Given: a habit whose loop fields hold short phrases (as the create flow now stores them)
    const habit = testHabit({
      loopCue: "I open my laptop",
      loopCraving: "to become a person who is amazing at AI",
      loopResponse: "read 1 page about AI prompting",
      loopReward: "a visible win",
    });

    // When: the loop diagram renders
    render(<LoopDiagram habit={habit} onUpdate={vi.fn()} />);

    // Then: the recap supplies the connectors and reads as one clean sentence
    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent ===
          "When i open my laptop, I want to become a person who is amazing at ai, so I read 1 page about ai prompting, and the reward is a visible win.",
      ),
    ).toBeTruthy();
  });

  it("repairs legacy cravings stored without a leading 'to'", () => {
    // Given: an older habit whose craving was stored as a bare verb phrase
    const habit = testHabit({
      loopCue: "I sit at my desk",
      loopCraving: "become a writer",
      loopResponse: "write one line",
      loopReward: "a finished sentence",
    });

    // When: the loop diagram renders
    render(<LoopDiagram habit={habit} onUpdate={vi.fn()} />);

    // Then: the recap reads "I want to become a writer", not "I want become a writer"
    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent ===
          "When i sit at my desk, I want to become a writer, so I write one line, and the reward is a finished sentence.",
      ),
    ).toBeTruthy();
  });
});
