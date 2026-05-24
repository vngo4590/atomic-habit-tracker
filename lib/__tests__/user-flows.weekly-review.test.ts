import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { dateAdd } from "@/lib/helpers";
import { useStore } from "@/lib/store";
import { testHabit } from "@/lib/test/fixtures";
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

describe("Flow 4: Weekly Review Cycle", () => {
  it("displays 7-day bars, saves a review, and supports edits", () => {
    // Given: It's Sunday and the user has check-in data for the week
    const weekStart = "2030-01-07"; // Monday
    const habits = [
      testHabit({ id: "h1", history: { "2030-01-07": true, "2030-01-08": true, "2030-01-09": true } }),
      testHabit({ id: "h2", history: { "2030-01-07": true, "2030-01-10": true } }),
    ];

    const { result } = renderHook(() =>
      useStore(
        makeSnapshot({
          habits,
          weeklyReviews: [],
        }),
      ),
    );

    // When: They open the weekly review
    // (compute the same 7-day bars the review page uses)
    const days = Array.from({ length: 7 }, (_, i) => dateAdd(weekStart, i));
    const totals = {
      done: days.reduce(
        (sum, day) => sum + habits.filter((habit) => habit.history[day]).length,
        0,
      ),
      possible: days.length * habits.length,
    };

    // Then: They see their 7-day completion bars
    expect(totals.possible).toBe(14); // 7 days * 2 habits
    expect(totals.done).toBe(5); // 3 + 2 check-ins

    // When: They answer all three reflection questions
    const answers = {
      wentWell: "Kept the cue visible.",
      smallestFix: "Put the book on the keyboard.",
      identityVote: "I am a reader.",
    };
    act(() => result.current.setWeeklyReview(weekStart, answers));

    // Then: The review is saved and appears in "Past reviews"
    expect(result.current.weeklyReviews).toHaveLength(1);
    expect(result.current.weeklyReviews[0].weekStartKey).toBe(weekStart);
    expect(result.current.weeklyReviews[0].wentWell).toBe("Kept the cue visible.");

    // When: They edit the same week's review
    const updatedAnswers = {
      wentWell: "Read every morning without fail.",
      smallestFix: "Set out the book the night before.",
      identityVote: "I am a consistent reader.",
    };
    act(() => result.current.setWeeklyReview(weekStart, updatedAnswers));

    // Then: The updated answers replace the old ones
    expect(result.current.weeklyReviews).toHaveLength(1);
    expect(result.current.weeklyReviews[0].wentWell).toBe("Read every morning without fail.");
    expect(result.current.weeklyReviews[0].smallestFix).toBe("Set out the book the night before.");
  });
});

// ===========================================================================
// Flow 5: Lessons & Curriculum

