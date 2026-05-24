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

  it("shows progress dots that indicate the current step", () => {
    // Given the onboarding overlay is rendered
    const onComplete = vi.fn();
    const { container } = render(<OnboardingOverlay onComplete={onComplete} />);

    // When on step 1 (index 0)
    // Then there are 4 progress indicator bars (one per onboarding step).
    // We query by the data-testid the component exposes so the test stays
    // stable across styling refactors.
    const bars = container.querySelectorAll('[data-testid="onboarding-progress-dot"]');
    expect(bars.length).toBe(4);
  });

  it("advances to the next step when the action button is clicked", async () => {
    // Given the onboarding overlay is on the Welcome step
    const onComplete = vi.fn();
    render(<OnboardingOverlay onComplete={onComplete} />);

    // When the user clicks Begin
    fireEvent.click(screen.getByText("Begin"));

    // Then the Name step is shown
    await waitFor(() => {
      expect(screen.getByText("Name")).toBeTruthy();
      expect(screen.getByText("What should we call you?")).toBeTruthy();
    });
  });

  it("shows a name input field on step 2", async () => {
    // Given the user has advanced to step 2
    const onComplete = vi.fn();
    render(<OnboardingOverlay onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Begin"));

    // Then a text input for the name is visible
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Your name")).toBeTruthy();
    });
  });

  it("does not allow advancing past step 2 without entering a name", async () => {
    // Given the user is on the Name step and the input is empty
    const onComplete = vi.fn();
    render(<OnboardingOverlay onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Begin"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Your name")).toBeTruthy();
    });

    // When the user clicks Continue without typing a name
    fireEvent.click(screen.getByText("Continue"));

    // Then the user is still on the Name step
    await waitFor(() => {
      expect(screen.getByText("Name")).toBeTruthy();
      expect(screen.getByPlaceholderText("Your name")).toBeTruthy();
    });

    // And onComplete was not called
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("allows advancing past step 2 after entering a name", async () => {
    // Given the user is on the Name step
    const onComplete = vi.fn();
    render(<OnboardingOverlay onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Begin"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Your name")).toBeTruthy();
    });

    // When the user types their name and clicks Continue
    fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "Alice" } });
    fireEvent.click(screen.getByText("Continue"));

    // Then the Identity step is shown
    await waitFor(() => {
      expect(screen.getByText("Identity")).toBeTruthy();
      expect(screen.getByText("Habits are identity votes.")).toBeTruthy();
    });
  });

  it("completes onboarding immediately when Skip is clicked", () => {
    // Given the onboarding overlay is on the Welcome step
    const onComplete = vi.fn();
    render(<OnboardingOverlay onComplete={onComplete} />);

    // When the user clicks Skip
    fireEvent.click(screen.getByText("Skip"));

    // Then onComplete is called immediately
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("passes the entered name to onComplete when finishing from the final step", async () => {
    // Given the user has progressed through onboarding and entered a name
    const onComplete = vi.fn();
    render(<OnboardingOverlay onComplete={onComplete} />);

    // Advance through all steps
    fireEvent.click(screen.getByText("Begin"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Your name")).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "Alice" } });
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(screen.getByText("Identity")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Continue"));

    // Then the Ready step is visible
    await waitFor(() => {
      expect(screen.getByText("Ready")).toBeTruthy();
      expect(screen.getByText("Start with the smallest useful action.")).toBeTruthy();
    });

    // When the user clicks Start on the final step
    fireEvent.click(screen.getByText("Start"));

    // Then onComplete is called with the entered name
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("Alice");
  });

  it("passes undefined to onComplete when finishing without a name", () => {
    // Given the user skips onboarding from the first step
    const onComplete = vi.fn();
    render(<OnboardingOverlay onComplete={onComplete} />);

    // When the user clicks Skip immediately
    fireEvent.click(screen.getByText("Skip"));

    // Then onComplete is called with undefined (no name provided)
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(undefined);
  });
});
