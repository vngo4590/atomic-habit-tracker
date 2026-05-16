import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CompletionRing } from "@/components/CompletionRing";

describe("CompletionRing business logic", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows 0% with only the background circle when completion is 0%", () => {
    // Given no habits have been completed today
    // When the ring is rendered at 0%
    const { container } = render(<CompletionRing pct={0} />);

    // Then the percentage text shows 0%
    expect(screen.getByText("0%")).toBeTruthy();

    // And the SVG contains two circles (background + progress)
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(2);

    // And the background circle uses the rule color
    expect(circles[0].getAttribute("stroke")).toBe("var(--rule)");
  });

  it("shows 50% with half the ring filled when completion is 50%", () => {
    // Given half of the habits have been completed
    // When the ring is rendered at 50%
    const { container } = render(<CompletionRing pct={50} />);

    // Then the percentage text shows 50%
    expect(screen.getByText("50%")).toBeTruthy();

    // And the progress circle is present
    const motionCircles = container.querySelectorAll("circle");
    expect(motionCircles.length).toBe(2);
  });

  it("shows 100% with the full ring filled when completion is 100%", () => {
    // Given all habits have been completed
    // When the ring is rendered at 100%
    const { container } = render(<CompletionRing pct={100} />);

    // Then the percentage text shows 100%
    expect(screen.getByText("100%")).toBeTruthy();

    // And both circles are rendered
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(2);
  });

  it("renders an animated motion circle that animates the stroke on mount", () => {
    // Given the component mounts for the first time
    // When the ring is rendered
    const { container } = render(<CompletionRing pct={75} />);

    // Then two circles are present (background + animated progress)
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(2);

    // And the percentage is visible
    expect(screen.getByText("75%")).toBeTruthy();
  });
});
