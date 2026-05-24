import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingGate } from "@/components/OnboardingGate";
import { StoreContextProvider } from "@/components/StoreProvider";
import { testPreferences, testStoreContext } from "@/lib/test/fixtures";

const LEGACY_KEY = "atomicly:onboarding-seen";

// Stub a fresh localStorage per test so we are not at the mercy of leftover
// stubs from sibling test files that share the same Vitest worker.
let storage: Map<string, string>;

beforeEach(() => {
  storage = new Map();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
      clear: vi.fn(() => {
        storage.clear();
      }),
    },
  });
});

afterEach(() => {
  cleanup();
});

describe("OnboardingGate", () => {

  it("shows the onboarding overlay when onboardingSeen is false", () => {
    // Given a fresh user whose server-side preference is onboardingSeen=false
    const store = testStoreContext({ preferences: testPreferences({ onboardingSeen: false }) });

    // When the gate renders
    render(
      <StoreContextProvider value={store}>
        <OnboardingGate />
      </StoreContextProvider>,
    );

    // Then the Welcome step is on screen
    expect(screen.getByText("Welcome")).toBeTruthy();
  });

  it("hides the onboarding overlay when onboardingSeen is true", () => {
    // Given a returning user whose server-side preference is onboardingSeen=true
    const store = testStoreContext({ preferences: testPreferences({ onboardingSeen: true }) });

    // When the gate renders
    render(
      <StoreContextProvider value={store}>
        <OnboardingGate />
      </StoreContextProvider>,
    );

    // Then no onboarding overlay UI is visible
    expect(screen.queryByText("Welcome")).toBeNull();
  });

  it("does NOT consult localStorage when deciding visibility (regression guard)", () => {
    // Given a stale legacy localStorage flag from a previous browser session
    // (e.g. left over by a different account on the same machine)
    window.localStorage.setItem(LEGACY_KEY, "true");

    // And a brand-new user whose server-side preference is still false
    const store = testStoreContext({ preferences: testPreferences({ onboardingSeen: false }) });

    // When the gate renders
    render(
      <StoreContextProvider value={store}>
        <OnboardingGate />
      </StoreContextProvider>,
    );

    // Then the overlay still appears because the server flag (per-user)
    // is the only source of truth — localStorage no longer suppresses it.
    expect(screen.getByText("Welcome")).toBeTruthy();
  });

  it("persists onboardingSeen=true via setPreferences when Skip is clicked", () => {
    // Given the gate is rendering the overlay
    const setPreferences = vi.fn();
    const store = testStoreContext({
      preferences: testPreferences({ onboardingSeen: false }),
      setPreferences,
    });

    render(
      <StoreContextProvider value={store}>
        <OnboardingGate />
      </StoreContextProvider>,
    );

    // When the user clicks Skip
    fireEvent.click(screen.getByText("Skip"));

    // Then the gate calls setPreferences with onboardingSeen=true so the
    // server preference flips and the overlay won't show again.
    expect(setPreferences).toHaveBeenCalledTimes(1);
    expect(setPreferences).toHaveBeenCalledWith({ onboardingSeen: true });
  });
});
