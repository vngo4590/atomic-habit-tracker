import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { isDone } from "@/features/habits";
import { applyStackMutationAction } from "@/features/stacks/actions";
import { todayKey } from "@/lib/helpers";
import { useStore } from "@/lib/store";
import type { Habit } from "@/lib/types";

import { makeStoreTestHabit } from "@/lib/store/__tests__/store-test-helpers";

vi.mock("@/features/habits/actions", () => ({
  createHabitAction: vi.fn(),
  deleteHabitAction: vi.fn(),
  logCheckInAction: vi.fn(async () => null),
  saveFormationVerdictAction: vi.fn(),
  toggleHabitAction: vi.fn(async () => null),
  updateHabitAction: vi.fn(async () => null),
}));
vi.mock("@/features/stacks/actions", () => ({ applyStackMutationAction: vi.fn() }));
vi.mock("@/features/reflection/actions", () => ({
  createJournalEntryAction: vi.fn(),
  markLessonReadAction: vi.fn(),
  saveIdentityAction: vi.fn(),
  saveWeeklyReviewAction: vi.fn(),
  updateJournalEntryAction: vi.fn(),
}));
vi.mock("@/features/settings/actions", () => ({ savePreferencesAction: vi.fn() }));

function habit(id: string): Habit {
  return { ...makeStoreTestHabit({}), id, name: `Habit ${id}`, stackNextId: null };
}

function renderStore() {
  return renderHook(() =>
    useStore({
      habits: [habit("a"), habit("b")],
      journal: [],
      identity: { statement: "", values: [] },
      weeklyReview: { wentWell: "", smallestFix: "", identityVote: "" },
      completedLessons: [],
      formationVerdicts: [],
      preferences: {
        theme: "light",
        accentHue: 60,
        remindersEnabled: true,
        weeklyReviewNudge: true,
        accountabilityNudge: false,
        onboardingSeen: true,
        lessonMode: "sequential",
        timezone: "UTC",
      },
    }),
  );
}

const linkBAfterA = { kind: "insert", habitId: "b", position: "after", targetId: "a" } as const;

describe("stack mutations in the client store", () => {
  it("keeps a check-in made while the stack request was in flight", async () => {
    // Given a stack request whose response is still pending
    let resolve: (habits: Habit[]) => void = () => {};
    vi.mocked(applyStackMutationAction).mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    const { result } = renderStore();
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = result.current.applyStackMutation(linkBAfterA); });

    // When the user checks in habit A, then the stale server copy of A arrives
    act(() => result.current.toggleHabit("a"));
    await act(async () => {
      resolve([{ ...habit("a"), stackNextId: "b" }, habit("b")]);
      await pending;
    });

    // Then A is linked to B and today's check-in survives
    const a = result.current.habits.find((h) => h.id === "a")!;
    expect(a.stackNextId).toBe("b");
    expect(isDone(a.history[todayKey()])).toBe(true);
  });

  it("rolls back only the link when the request fails", async () => {
    // Given a stack request that will fail
    let reject: (error: Error) => void = () => {};
    vi.mocked(applyStackMutationAction).mockReturnValueOnce(new Promise((_, r) => { reject = r; }));
    const { result } = renderStore();
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = result.current.applyStackMutation(linkBAfterA); });
    act(() => result.current.toggleHabit("a"));

    // When the server rejects it
    await act(async () => {
      reject(new Error("nope"));
      await pending.catch(() => {});
    });

    // Then the link is undone but the check-in is kept
    const a = result.current.habits.find((h) => h.id === "a")!;
    expect(a.stackNextId).toBeNull();
    expect(isDone(a.history[todayKey()])).toBe(true);
  });

  describe("overlapping stack requests", () => {
    const removeB = { kind: "remove", habitId: "b" } as const;
    const linkOf = (result: ReturnType<typeof renderStore>["result"], id: string) =>
      result.current.habits.find((h) => h.id === id)?.stackNextId ?? null;

    /** Start a stack request whose server answer the test settles by hand. */
    function deferStackRequest() {
      const settle = {} as { resolve: (habits: Habit[]) => void; reject: (error: Error) => void };
      vi.mocked(applyStackMutationAction).mockReturnValueOnce(
        new Promise((resolve, reject) => Object.assign(settle, { resolve, reject })),
      );
      return settle;
    }

    it("never restores an unsaved link when both an insert and a later remove fail", async () => {
      // Given an insert of B after A, then a removal of B, both still in flight
      const insert = deferStackRequest();
      const remove = deferStackRequest();
      const { result } = renderStore();
      let first: Promise<void> = Promise.resolve();
      let second: Promise<void> = Promise.resolve();
      act(() => { first = result.current.applyStackMutation(linkBAfterA); });
      act(() => { second = result.current.applyStackMutation(removeB); });

      // When both requests fail (insert first, then remove)
      await act(async () => {
        insert.reject(new Error("nope"));
        await first.catch(() => {});
      });
      await act(async () => {
        remove.reject(new Error("nope"));
        await second.catch(() => {});
      });

      // Then A is back to the server's state: not linked to B
      expect(linkOf(result, "a")).toBeNull();
    });

    it("keeps a confirmed removal while an older insert is still in flight", async () => {
      // Given an insert of B after A, then a removal of B, both in flight
      const insert = deferStackRequest();
      const remove = deferStackRequest();
      const { result } = renderStore();
      let first: Promise<void> = Promise.resolve();
      let second: Promise<void> = Promise.resolve();
      act(() => { first = result.current.applyStackMutation(linkBAfterA); });
      act(() => { second = result.current.applyStackMutation(removeB); });

      // When the removal succeeds first
      await act(async () => {
        remove.resolve([habit("a"), habit("b")]);
        await second;
      });

      // Then A is unlinked even though the older insert has not settled
      expect(linkOf(result, "a")).toBeNull();

      // And a late success of the older insert does not relink it
      await act(async () => {
        insert.resolve([{ ...habit("a"), stackNextId: "b" }, habit("b")]);
        await first;
      });
      expect(linkOf(result, "a")).toBeNull();
    });

    it("keeps a confirmed link when an earlier request fails after it", async () => {
      // Given an insert of B after A and a second identical insert, both in flight
      const firstInsert = deferStackRequest();
      const secondInsert = deferStackRequest();
      const { result } = renderStore();
      let first: Promise<void> = Promise.resolve();
      let second: Promise<void> = Promise.resolve();
      act(() => { first = result.current.applyStackMutation(linkBAfterA); });
      act(() => { second = result.current.applyStackMutation(linkBAfterA); });

      // When the second succeeds on the server and then the first fails
      await act(async () => {
        secondInsert.resolve([{ ...habit("a"), stackNextId: "b" }, habit("b")]);
        await second;
      });
      await act(async () => {
        firstInsert.reject(new Error("nope"));
        await first.catch(() => {});
      });

      // Then the server-confirmed A→B link stays
      expect(linkOf(result, "a")).toBe("b");
    });
  });
});