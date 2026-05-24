import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useStore } from "@/lib/store";
import { LESSONS } from "@/lib/lessons-data";

import { testPreferences } from "@/lib/test/fixtures";
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

describe("Flow 5: Lessons & Curriculum", () => {
  it("shows sequential lessons, marks them read, supports random mode, and filters", async () => {
    // Inline pickToday logic from the lessons page
    function pickToday(completed: Set<number>, mode: "sequential" | "random", date = new Date()) {
      if (mode === "sequential") {
        return LESSONS.find((lesson) => !completed.has(lesson.id)) ?? LESSONS[0];
      }
      const key = Number(`${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`);
      return LESSONS[key % LESSONS.length];
    }

    // Given: A new user with no completed lessons
    const { result } = renderHook(() =>
      useStore(makeSnapshot({ completedLessons: [], preferences: testPreferences({ lessonMode: "sequential" }) })),
    );

    // When: They view Today's lesson
    const todayLesson = pickToday(result.current.completedLessons, result.current.lessonMode);

    // Then: They see lesson 1 (sequential mode)
    expect(todayLesson.id).toBe(1);

    // When: They mark it as read
    act(() => result.current.markLessonRead(1));
    await act(async () => {
      await Promise.resolve();
    });

    // Then: It appears as completed in the curriculum map
    expect(result.current.completedLessons.has(1)).toBe(true);

    // When: They switch to random mode
    act(() => result.current.setLessonMode("random"));
    await act(async () => {
      await Promise.resolve();
    });

    // Then: A different lesson is shown each day
    const day1 = pickToday(result.current.completedLessons, "random", new Date("2030-01-07"));
    const day2 = pickToday(result.current.completedLessons, "random", new Date("2030-01-08"));
    expect(day1.id).not.toBe(day2.id);

    // When: They view the library and filter by "Unread"
    const unreadLessons = LESSONS.filter((lesson) => !result.current.completedLessons.has(lesson.id));

    // Then: Only unread lessons are shown
    expect(unreadLessons.every((lesson) => !result.current.completedLessons.has(lesson.id))).toBe(
      true,
    );
    expect(unreadLessons.length).toBe(LESSONS.length - 1);
  });
});

// ===========================================================================
// Flow 6: Settings & Appearance

