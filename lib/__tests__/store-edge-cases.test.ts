import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { todayKey } from "@/lib/helpers";
import {
  createHabitAction,
  deleteHabitAction,
  logCheckInAction,
  toggleHabitAction,
  updateHabitAction,
} from "@/lib/actions/domain";
import { testHabit } from "@/lib/test/fixtures";
import { useStore } from "@/lib/store";
import type { Habit } from "@/lib/types";

vi.mock("@/lib/actions/domain", () => ({
  createHabitAction: vi.fn(async () => null),
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

function makeSnapshot(habits: Habit[]) {
  return {
    habits,
    journal: [],
    identity: { statement: "", values: [] },
    weeklyReview: { wentWell: "", smallestFix: "", identityVote: "" },
    weeklyReviews: [],
    completedLessons: [],
    formationVerdicts: [],
    preferences: {
      theme: "light" as const,
      accentHue: 60,
      remindersEnabled: true,
      weeklyReviewNudge: true,
      accountabilityNudge: false,
      onboardingSeen: false,
      lessonMode: "sequential" as const,
      timezone: "UTC",
    },
  };
}

const TODAY = todayKey();

describe("toggleHabit unchecked to checked", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(toggleHabitAction).mockReset();
    vi.mocked(toggleHabitAction).mockReturnValue(new Promise(() => {}));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a toast with identity and vote count on first check-in", () => {
    // Given: a habit with no prior check-in today
    const habit = testHabit({ id: "h1", identity: "runner", history: {} });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: the user toggles the habit on for the first time today
    act(() => result.current.toggleHabit("h1", TODAY));

    // Then: a toast celebrates the identity vote
    expect(result.current.toast?.msg).toBe('Vote cast for "runner"');
    expect(result.current.toast?.sub).toBe("1 total");
  });

  it("includes the cumulative total vote count in the toast subtitle", () => {
    // Given: a habit with two prior check-ins; today will be the third vote
    const habit = testHabit({
      id: "h1",
      identity: "reader",
      history: { "2030-01-01": true, "2030-01-02": true },
    });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: toggling the habit on today
    act(() => result.current.toggleHabit("h1", TODAY));

    // Then: the subtitle reflects the new cumulative count
    expect(result.current.toast?.sub).toBe("3 total");
  });
});

describe("toggleHabit checked to unchecked", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(toggleHabitAction).mockReset();
    vi.mocked(toggleHabitAction).mockReturnValue(new Promise(() => {}));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes the history entry and shows no toast when toggling off", () => {
    // Given: a habit already marked done today
    const habit = testHabit({ id: "h1", identity: "runner", history: { [TODAY]: true } });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: the user toggles the habit off
    act(() => result.current.toggleHabit("h1", TODAY));

    // Then: the check-in is removed and no toast appears
    expect(result.current.habits[0].history[TODAY]).toBeUndefined();
    expect(result.current.toast).toBeNull();
  });
});

describe("logCheckIn behavior", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.mocked(logCheckInAction).mockReset();
    vi.mocked(logCheckInAction).mockReturnValue(new Promise(() => {}));
  });

  it("adds mood and journal without toggling the habit off", () => {
    // Given: a habit already checked in today
    const habit = testHabit({ id: "h1", history: { [TODAY]: { done: true } } });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: logging additional check-in details
    act(() => result.current.logCheckIn("h1", { mood: 4, journal: "Felt strong today" }));

    // Then: the entry stays done and gains the new fields
    const entry = result.current.habits[0].history[TODAY];
    expect(entry).toMatchObject({ done: true, mood: 4, journal: "Felt strong today" });
  });

  it("creates a new done entry when logging on a blank day", () => {
    // Given: a habit with no history for today
    const habit = testHabit({ id: "h1", history: {} });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: logging a check-in with a mood rating
    act(() => result.current.logCheckIn("h1", { mood: 5 }));

    // Then: a new entry is created with done: true
    const entry = result.current.habits[0].history[TODAY];
    expect(entry).toMatchObject({ done: true, mood: 5 });
  });

  it("removes the mood key when passing undefined", () => {
    // Given: a habit that already has a mood recorded today
    const habit = testHabit({ id: "h1", history: { [TODAY]: { done: true, mood: 3 } } });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: the user clears their mood by passing undefined
    act(() => result.current.logCheckIn("h1", { mood: undefined }));

    // Then: the mood property is removed but the check-in remains done
    const entry = result.current.habits[0].history[TODAY] as unknown as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(entry, "mood")).toBe(false);
    expect(entry.done).toBe(true);
  });

  it("removes the journal key when passing undefined", () => {
    // Given: a habit with a journal note today
    const habit = testHabit({ id: "h1", history: { [TODAY]: { done: true, journal: "Old note" } } });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: the user clears the journal by passing undefined
    act(() => result.current.logCheckIn("h1", { journal: undefined }));

    // Then: the journal property is removed but the check-in remains done
    const entry = result.current.habits[0].history[TODAY] as unknown as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(entry, "journal")).toBe(false);
    expect(entry.done).toBe(true);
  });
});

describe("addHabit behavior", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.mocked(createHabitAction).mockReset();
  });

  it("creates a temporary ID and replaces it with the server ID when saved", async () => {
    // Given: a server that returns a saved habit with a real ID
    const serverHabit = testHabit({ id: "server-h1", name: "Meditate", identity: "meditator" });
    let resolveCreate!: (habit: typeof serverHabit) => void;
    vi.mocked(createHabitAction).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );

    const { result } = renderHook(() => useStore(makeSnapshot([])));

    // When: the user adds a new habit
    act(() => result.current.addHabit({ name: "Meditate", identity: "meditator" }));
    const tempId = result.current.habits[0].id;

    // Then: it appears immediately with a pending temp ID
    expect(tempId.startsWith("pending-")).toBe(true);
    expect(result.current.habits[0].name).toBe("Meditate");

    // When: the server responds with the real habit
    await act(async () => {
      resolveCreate(serverHabit);
      await Promise.resolve();
    });

    // Then: the temp ID is swapped for the server ID
    expect(result.current.habits).toHaveLength(1);
    expect(result.current.habits[0].id).toBe("server-h1");
    expect(result.current.habits[0].name).toBe("Meditate");
  });
});

describe("updateHabit race condition handling", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.mocked(updateHabitAction).mockReset();
  });

  it("applies only the latest save when two updates resolve out of order", async () => {
    // Given: two concurrent updates with delayed server responses
    let resolveFirst: (patch: Partial<Habit>) => void = () => {};
    let resolveSecond: (patch: Partial<Habit>) => void = () => {};
    vi.mocked(updateHabitAction)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
      );

    const { result } = renderHook(() => useStore(makeSnapshot([testHabit({ id: "h1" })])));

    // When: two rapid edits are made
    act(() => result.current.updateHabit("h1", { cue: "First cue" }));
    act(() => result.current.updateHabit("h1", { craving: "Second craving" }));

    // When: the first (stale) server response returns
    await act(async () => {
      resolveFirst({ cue: "First cue", craving: "" });
      await Promise.resolve();
    });

    // Then: the newer local edit is preserved despite the stale response
    expect(result.current.habits[0].craving).toBe("Second craving");

    // When: the second (latest) server response returns
    await act(async () => {
      resolveSecond({ cue: "First cue", craving: "Second craving" });
      await Promise.resolve();
    });

    // Then: both fields end up correct
    expect(result.current.habits[0].cue).toBe("First cue");
    expect(result.current.habits[0].craving).toBe("Second craving");
  });
});

describe("deleteHabit behavior", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.mocked(deleteHabitAction).mockReset();
  });

  it("removes the habit from the list immediately and calls the server", () => {
    // Given: a store with two habits
    const habitA = testHabit({ id: "hA", name: "Read" });
    const habitB = testHabit({ id: "hB", name: "Run" });
    const { result } = renderHook(() => useStore(makeSnapshot([habitA, habitB])));

    // When: the user deletes habit A
    act(() => result.current.deleteHabit("hA"));

    // Then: only habit B remains and the server action was triggered
    expect(result.current.habits).toHaveLength(1);
    expect(result.current.habits[0].id).toBe("hB");
    expect(deleteHabitAction).toHaveBeenCalledWith("hA");
  });
});

describe("optimistic updates", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.mocked(toggleHabitAction).mockReset();
    vi.mocked(toggleHabitAction).mockReturnValue(new Promise(() => {}));
    vi.mocked(logCheckInAction).mockReset();
    vi.mocked(logCheckInAction).mockReturnValue(new Promise(() => {}));
    vi.mocked(deleteHabitAction).mockReset();
    vi.mocked(deleteHabitAction).mockReturnValue(new Promise(() => {}));
  });

  it("reflects toggleHabit in the UI before the server responds", () => {
    // Given: a habit with no check-in today and a server that never resolves
    const habit = testHabit({ id: "h1", history: {} });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: the user toggles the habit on
    act(() => result.current.toggleHabit("h1", TODAY));

    // Then: the UI immediately reflects the optimistic check-in
    expect(result.current.habits[0].history[TODAY]).toBeTruthy();
  });

  it("reflects logCheckIn in the UI before the server responds", () => {
    // Given: a habit with no history today and a server that never resolves
    const habit = testHabit({ id: "h1", history: {} });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: the user logs a check-in with mood
    act(() => result.current.logCheckIn("h1", { mood: 3 }));

    // Then: the UI immediately shows the optimistic entry
    const entry = result.current.habits[0].history[TODAY];
    expect(entry).toMatchObject({ done: true, mood: 3 });
  });

  it("reflects deleteHabit in the UI before the server responds", () => {
    // Given: a store with one habit and a server that never resolves
    const habit = testHabit({ id: "h1" });
    const { result } = renderHook(() => useStore(makeSnapshot([habit])));

    // When: the user deletes the habit
    act(() => result.current.deleteHabit("h1"));

    // Then: the UI immediately removes it
    expect(result.current.habits).toHaveLength(0);
  });
});
