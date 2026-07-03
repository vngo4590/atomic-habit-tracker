import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dimsForStage } from "@/lib/pet/sprite";

import { AdoptPanel } from "../AdoptPanel";

/**
 * Regression tests for the adopt preview. The bug: the preview drew a *juvenile*
 * (an evolved form) while every adopted pet actually starts as an egg, so the
 * creature the user picked "changed" the moment it was adopted. The fix draws the
 * preview at the egg stage so what you see is what you get, and evolution stays a
 * genuine surprise.
 */
describe("AdoptPanel preview", () => {
  afterEach(cleanup);

  /** The number of pixel cells the <PixelSprite> renders for a given stage. */
  function cellsForStage(stage: Parameters<typeof dimsForStage>[0]): number {
    const { width, height } = dimsForStage(stage);
    return width * height;
  }

  it("renders the preview at the egg (starting) stage, not an evolved form", () => {
    // Given the adopt panel with room to adopt
    render(<AdoptPanel onAdopt={vi.fn()} remainingSlots={1} />);

    // When we read the live creature preview
    const preview = screen.getByRole("img", { name: /egg preview/i });
    const cellCount = preview.querySelectorAll("span").length;

    // Then it is drawn as an egg — matching the actual adopted pet — and is NOT
    // the larger juvenile silhouette that used to mislead the user.
    expect(cellCount).toBe(cellsForStage("egg"));
    expect(cellCount).not.toBe(cellsForStage("juvenile"));
  });

  it("keeps the preview an egg after shuffling to a new creature", () => {
    // Given the panel; When the user shuffles the preview seed
    render(<AdoptPanel onAdopt={vi.fn()} remainingSlots={1} />);
    fireEvent.click(screen.getByRole("button", { name: /shuffle preview/i }));

    // Then the preview is still an egg (only the colour identity changes)
    const preview = screen.getByRole("img", { name: /egg preview/i });
    expect(preview.querySelectorAll("span").length).toBe(cellsForStage("egg"));
  });
});
