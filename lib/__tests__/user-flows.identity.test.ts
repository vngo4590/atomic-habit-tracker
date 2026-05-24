import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

describe("Flow 2: Identity Voting", () => {
  it("tallies identity votes and updates the statement", async () => {
    // Given: A user has habits for "reader", "runner", and "writer"
    const readerHabit = testHabit({
      id: "h_reader",
      name: "Read 10 pages",
      identity: "reader",
      history: {},
    });
    const runnerHabit = testHabit({
      id: "h_runner",
      name: "Run 5K",
      identity: "runner",
      history: {},
    });
    const writerHabit = testHabit({
      id: "h_writer",
      name: "Write 500 words",
      identity: "writer",
      history: {},
    });

    const { result } = renderHook(() =>
      useStore(makeSnapshot({ habits: [readerHabit, runnerHabit, writerHabit] })),
    );

    // When: They check off "reader" habits 5 times and "runner" once
    const days = [
      "2030-01-01",
      "2030-01-02",
      "2030-01-03",
      "2030-01-04",
      "2030-01-05",
    ];
    days.forEach((day) => {
      act(() => result.current.toggleHabit("h_reader", day));
    });
    act(() => result.current.toggleHabit("h_runner", "2030-01-01"));

    // Then: The Identity page shows "reader" with 5 votes, "runner" with 1
    const habits = result.current.habits;
    const tally = new Map<string, number>();
    habits.forEach((habit) => {
      const votes = Object.keys(habit.history).filter((key) => Boolean(habit.history[key])).length;
      tally.set(habit.identity, (tally.get(habit.identity) ?? 0) + votes);
    });
    expect(tally.get("reader")).toBe(5);
    expect(tally.get("runner")).toBe(1);

    // And: The vote ledger bar for "reader" is 5x longer than "runner"
    const max = Math.max(1, ...Array.from(tally.values()));
    const readerBar = Math.round(((tally.get("reader") ?? 0) / max) * 100);
    const runnerBar = Math.round(((tally.get("runner") ?? 0) / max) * 100);
    expect(readerBar).toBe(100);
    expect(runnerBar).toBe(20);
    expect(readerBar / runnerBar).toBe(5);

    // When: They update their identity statement
    act(() =>
      result.current.setIdentity({
        statement: "I am someone who shows up every day.",
        values: ["Consistency"],
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });

    // Then: The new statement appears on the Today page
    expect(result.current.identity.statement).toBe("I am someone who shows up every day.");
  });
});

// ===========================================================================
// Flow 3: Journal & Mood Tracking

