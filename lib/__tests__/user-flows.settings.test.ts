import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useStore } from "@/lib/store";
import { applyAppearance } from "@/lib/appearance";
import { makeSnapshot, installUserFlowMocksHook } from "./_user-flow-helpers";

// vi.mock is only hoisted within the file that contains it, so each
// split file installs its own @/lib/actions/domain mock.
vi.mock("@/lib/actions/domain", () => ({
  createHabitAction: vi.fn(),
  createJournalEntryAction: vi.fn(),
  deleteHabitAction: vi.fn(),
  logCheckInAction: vi.fn(async () => null),
  markLessonReadAction: vi.fn(),
  saveFormationVerdictAction: vi.fn(),
  saveIdentityAction: vi.fn(async (identity: unknown) => identity),
  savePreferencesAction: vi.fn(),
  saveWeeklyReviewAction: vi.fn(),
  toggleHabitAction: vi.fn(async () => null),
  updateHabitAction: vi.fn(async () => null),
  updateJournalEntryAction: vi.fn(async () => null),
}));

// Wire installUserFlowMocks() into beforeEach for every test in this file.
installUserFlowMocksHook();

describe("Flow 6: Settings & Appearance", () => {
  it("switches theme, accent, and reminder preferences", async () => {
    // Given: A user on the default light theme
    const { result } = renderHook(() => useStore(makeSnapshot()));
    expect(result.current.preferences.theme).toBe("light");

    // When: They switch to dark mode
    act(() => result.current.setPreferences({ theme: "dark" }));
    await act(async () => {
      await Promise.resolve();
    });

    // Then: The theme is saved and applied
    expect(result.current.preferences.theme).toBe("dark");

    // Verify localStorage side-effect via applyAppearance
    applyAppearance("dark", result.current.preferences.accentHue);
    expect(window.localStorage.getItem("atomicly:theme")).toBe("dark");

    // When: They change accent to Sage (hue 145)
    act(() => result.current.setPreferences({ accentHue: 145 }));
    await act(async () => {
      await Promise.resolve();
    });

    // Then: The accent color updates
    expect(result.current.preferences.accentHue).toBe(145);
    applyAppearance(result.current.preferences.theme, 145);
    expect(window.localStorage.getItem("atomicly:accent")).toBe("145");

    // When: They toggle off daily reminders
    act(() => result.current.setPreferences({ remindersEnabled: false }));
    await act(async () => {
      await Promise.resolve();
    });

    // Then: The preference is saved
    expect(result.current.preferences.remindersEnabled).toBe(false);
  });
});

