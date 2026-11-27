import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OnboardingGate } from "@/components/OnboardingGate";
import { StoreContextProvider } from "@/components/StoreProvider";
import { testPreferences, testStoreContext } from "@/lib/test/fixtures";

// Simulates the overlay's lazy chunk failing to load (offline, stale deploy).
vi.mock("@/components/OnboardingOverlay", () => {
  throw new Error("ChunkLoadError");
});

afterEach(cleanup);

describe("OnboardingGate when the overlay chunk fails to load", () => {
  it("shows a plain welcome dialog whose Continue marks onboarding as seen", async () => {
    // Given a first-run user
    const setPreferences = vi.fn();
    const store = testStoreContext({
      preferences: testPreferences({ onboardingSeen: false }),
      setPreferences,
    });

    // When the gate renders and the overlay import rejects
    render(
      <StoreContextProvider value={store}>
        <OnboardingGate />
      </StoreContextProvider>,
    );

    // Then a fallback dialog appears instead of crashing the shell
    const dialog = await screen.findByRole("dialog", { name: "Welcome to Atomicly" }, { timeout: 5000 });

    // And Continue completes onboarding
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(dialog).toBeTruthy();
    expect(setPreferences).toHaveBeenCalledWith({ onboardingSeen: true });
  });
});
