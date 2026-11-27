import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useStore } from "@/lib/store";
import { applyAppearance } from "@/lib/appearance";
import { makeSnapshot, installUserFlowMocksHook } from "./_user-flow-helpers";

// vi.mock is only hoisted within the file that contains it, so each
// split file installs its own server-action mocks (habits, stacks and
// the reflection and settings actions).
vi.mock("@/features/habits/actions", () => ({
  createHabitAction: vi.fn(),
  deleteHabitAction: vi.fn(),
  logCheckInAction: vi.fn(async () => null),
  saveFormationVerdictAction: vi.fn(),
  toggleHabitAction: vi.fn(async () => null),
  updateHabitAction: vi.fn(async () => null),
}));
vi.mock("@/features/stacks/actions", () => ({
  applyStackMutationAction: vi.fn(),
}));
vi.mock("@/features/reflection/actions", () => ({
  createJournalEntryAction: vi.fn(),
  markLessonReadAction: vi.fn(),
  saveIdentityAction: vi.fn(async (identity: unknown) => identity),
  saveWeeklyReviewAction: vi.fn(),
  updateJournalEntryAction: vi.fn(async () => null),
}));
vi.mock("@/features/settings/actions", () => ({
  savePreferencesAction: vi.fn(),
}));

// Wire installUserFlowMocks() into beforeEach for every test in this file.
installUserFlowMocksHook();

describe("Flow 6: Settings & Appearance", () => {
  it("switches theme, accent, and reminder preferences", async () => {
    // Given: A user on the default light theme
    const { result } = renderHook(() => useStore(makeSnapshot()));
    expect(result.current.preferences.theme).toBe("light");

    // When: They switch to dark mode
    await act(async () => {
      await result.current.setPreferences({ theme: "dark" });
    });

    // Then: The theme is saved and applied
    expect(result.current.preferences.theme).toBe("dark");

    // Verify localStorage side-effect via applyAppearance
    applyAppearance("dark", result.current.preferences.accentHue);
    expect(window.localStorage.getItem("atomicly:theme")).toBe("dark");

    // When: They change accent to Sage (hue 145)
    await act(async () => {
      await result.current.setPreferences({ accentHue: 145 });
    });

    // Then: The accent color updates
    expect(result.current.preferences.accentHue).toBe(145);
    applyAppearance(result.current.preferences.theme, 145);
    expect(window.localStorage.getItem("atomicly:accent")).toBe("145");

    // When: They toggle off daily reminders
    await act(async () => {
      await result.current.setPreferences({ remindersEnabled: false });
    });

    // Then: The preference is saved
    expect(result.current.preferences.remindersEnabled).toBe(false);
  });
});

