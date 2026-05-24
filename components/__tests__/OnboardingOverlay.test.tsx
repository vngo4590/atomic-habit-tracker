import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OnboardingOverlay } from "@/components/OnboardingOverlay";

describe("OnboardingOverlay business logic", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the Welcome step first with the Begin action", () => {
    // Given the onboarding overlay is rendered for the first time
    const onComplete = vi.fn();

    // When it mounts
    render(<OnboardingOverlay onComplete={onComplete} />);

    // Then the Welcome step is visible
    expect(screen.getByText("Welcome")).toBeTruthy();
    expect(screen.getByText("Build evidence, one vote at a time.")).toBeTruthy();

    // And the action button says Begin
    expect(screen.getByText("Begin")).toBeTruthy();
  });

  it("shows three progress dots — one per onboarding step", () => {
    // Given the onboarding overlay is rendered
    const onComplete = vi.fn();
    const { container } = render(<OnboardingOverlay onComplete={onComplete} />);

    // When inspecting the progress indicators
    // Then there are exactly 3 progress dots (Welcome / Identity / Ready),
    // matching the number of steps after the name step was removed.
    const bars = container.querySelectorAll('[data-testid="onboarding-progress-dot"]');
    expect(bars.length).toBe(3);
  });

  it("does not render a name input on any step", async () => {
    // Given onboarding is rendered (regression guard — registration already
    // collected the user's name, so the overlay must never ask for it).
    const onComplete = vi.fn();
    render(<OnboardingOverlay onComplete={onComplete} />);

    // Then there is no "Your name" input on the Welcome step
    expect(screen.queryByPlaceholderText("Your name")).toBeNull();

    // When the user advances to the next step
    fireEvent.click(screen.getByText("Begin"));

    // Then still no name input is shown on subsequent steps
    await waitFor(() => {
      expect(screen.getByText("Identity")).toBeTruthy();
    });
    expect(screen.queryByPlaceholderText("Your name")).toBeNull();
  });

  it("advances from Welcome to Identity when Begin is clicked", async () => {
    // Given the onboarding overlay is on the Welcome step
    const onComplete = vi.fn();
    render(<OnboardingOverlay onComplete={onComplete} />);

    // When the user clicks Begin
    fireEvent.click(screen.getByText("Begin"));

    // Then the Identity step is shown next (no Name step in between)
    await waitFor(() => {
      expect(screen.getByText("Identity")).toBeTruthy();
      expect(screen.getByText("Habits are identity votes.")).toBeTruthy();
    });
  });

  it("advances from Identity to Ready when Continue is clicked", async () => {
    // Given the user has reached the Identity step
    const onComplete = vi.fn();
    render(<OnboardingOverlay onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Begin"));

    await waitFor(() => {
      expect(screen.getByText("Identity")).toBeTruthy();
    });

    // When the user clicks Continue
    fireEvent.click(screen.getByText("Continue"));

    // Then the Ready step is shown
    await waitFor(() => {
      expect(screen.getByText("Ready")).toBeTruthy();
      expect(screen.getByText("Start with the smallest useful action.")).toBeTruthy();
    });
  });

  it("completes onboarding immediately when Skip is clicked", () => {
    // Given the onboarding overlay is on the Welcome step
    const onComplete = vi.fn();
    render(<OnboardingOverlay onComplete={onComplete} />);

    // When the user clicks Skip
    fireEvent.click(screen.getByText("Skip"));

    // Then onComplete is called immediately with no arguments
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith();
  });

  it("calls onComplete when Start is clicked on the final step", async () => {
    // Given the user has progressed through all three steps
    const onComplete = vi.fn();
    render(<OnboardingOverlay onComplete={onComplete} />);

    fireEvent.click(screen.getByText("Begin"));
    await waitFor(() => {
      expect(screen.getByText("Identity")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Continue"));
    await waitFor(() => {
      expect(screen.getByText("Ready")).toBeTruthy();
    });

    // When the user clicks Start on the final step
    fireEvent.click(screen.getByText("Start"));

    // Then onComplete is called exactly once with no arguments
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith();
  });
});
