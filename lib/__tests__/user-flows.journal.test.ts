import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useStore } from "@/lib/store";
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

describe("Flow 3: Journal & Mood Tracking", () => {
  it("creates, edits, and customizes journal entries", async () => {
    // Given: A user wants to reflect on their day
    const { result } = renderHook(() => useStore(makeSnapshot()));

    // When: They create a journal entry titled "Small win" with mood "Good"
    act(() =>
      result.current.addJournal({ title: "Small win", body: "Read before breakfast.", mood: "Good" }),
    );

    // Then: It appears at the top of their journal list
    expect(result.current.journal).toHaveLength(1);
    expect(result.current.journal[0].title).toBe("Small win");
    expect(result.current.journal[0].mood).toBe("Good");

    await act(async () => {
      await Promise.resolve();
    });
    const entryId = result.current.journal[0].id;

    // When: They edit the entry to mood "Great"
    act(() => result.current.updateJournal(entryId, { mood: "Great" }));

    // Then: The mood chip updates
    expect(result.current.journal[0].mood).toBe("Great");

    // When: They create a custom mood with emoji 🚀 and label "Rocket"
    act(() =>
      result.current.addJournal({ title: "Launch day", body: "Shipped the feature.", mood: "🚀 Rocket" }),
    );
    await act(async () => {
      await Promise.resolve();
    });

    // Then: The custom mood appears in the entry
    expect(result.current.journal[0].mood).toBe("🚀 Rocket");
  });
});

// ===========================================================================
// Flow 4: Weekly Review Cycle

