import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { todayKey } from "@/lib/helpers";
import {
  createJournalEntryAction,
  markLessonReadAction,
  saveIdentityAction,
  updateJournalEntryAction,
} from "@/features/reflection/actions";
import { savePreferencesAction } from "@/features/settings/actions";
import { updateHabitAction } from "@/features/habits/actions";
import { useStore } from "@/lib/store";

import { makeLocalStorageMock } from "@/lib/store/__tests__/store-test-helpers";

// Pin "today" to a Wednesday so schedule-aware streak tests are deterministic.
vi.mock("@/lib/helpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/helpers")>("@/lib/helpers");
  return {
    ...actual,
    todayKey: (...args: unknown[]) => {
      if (args.length > 0) return actual.todayKey(args[0] as never);
      return "2030-01-09";
    },
  };
});

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
  saveIdentityAction: vi.fn(async (identity) => identity),
  saveWeeklyReviewAction: vi.fn(),
  updateJournalEntryAction: vi.fn(async () => null),
}));
vi.mock("@/features/settings/actions", () => ({
  savePreferencesAction: vi.fn(),
}));

let localStorageMock: ReturnType<typeof makeLocalStorageMock>;

describe("store settings mutations", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    localStorageMock = {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      }),
      clear: vi.fn(() => {
        store.clear();
      }),
    };

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });
    vi.stubGlobal("localStorage", localStorageMock);
    vi.useRealTimers();
    vi.mocked(createJournalEntryAction).mockImplementation(async (entry) => ({
      id: "saved-journal",
      date: entry.date ?? todayKey(),
      title: entry.title ?? "",
      body: entry.body ?? "",
      mood: entry.mood ?? "good",
      tags: entry.tags ?? [],
    }));
    vi.mocked(saveIdentityAction).mockImplementation(async (identity) => identity);
    vi.mocked(savePreferencesAction).mockImplementation(async (preferences) => ({
      theme: "light",
      accentHue: 60,
      remindersEnabled: true,
      weeklyReviewNudge: true,
      accountabilityNudge: false,
      onboardingSeen: false,
      lessonMode: "sequential",
      timezone: "UTC",
      ...preferences,
    }));
    vi.mocked(markLessonReadAction).mockImplementation(async (lessonId) => [lessonId]);
    vi.mocked(updateHabitAction).mockImplementation(async () => null);
    vi.mocked(updateJournalEntryAction).mockImplementation(async () => null);
  });

  it("persists lesson mode and preference updates", async () => {
    vi.mocked(savePreferencesAction).mockResolvedValueOnce({
      theme: "dark",
      accentHue: 145,
      remindersEnabled: false,
      weeklyReviewNudge: false,
      accountabilityNudge: true,
      onboardingSeen: true,
      lessonMode: "random",
      timezone: "Australia/Sydney",
    });
    const { result } = renderHook(() =>
      useStore({
        habits: [],
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
          onboardingSeen: false,
          lessonMode: "sequential",
          timezone: "UTC",
        },
      }),
    );

    act(() => result.current.setLessonMode("random"));
    expect(result.current.lessonMode).toBe("random");
    expect(result.current.preferences.lessonMode).toBe("random");
    expect(savePreferencesAction).toHaveBeenCalledWith({ lessonMode: "random" });

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.preferences).toMatchObject({ lessonMode: "random", timezone: "Australia/Sydney" });

    vi.mocked(savePreferencesAction).mockResolvedValueOnce({
      theme: "dark",
      accentHue: 145,
      remindersEnabled: false,
      weeklyReviewNudge: false,
      accountabilityNudge: true,
      onboardingSeen: true,
      lessonMode: "random",
      timezone: "Australia/Sydney",
    });
    act(() => {
      void result.current.setPreferences({ theme: "dark", accentHue: 145 });
    });
    expect(result.current.preferences).toMatchObject({ theme: "dark", accentHue: 145 });

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.preferences).toMatchObject({ timezone: "Australia/Sydney", accountabilityNudge: true, lessonMode: "random" });
  });

  it("rolls back a failed preference save, tells the user and resolves false", async () => {
    // Given the server will reject the next preference save
    vi.mocked(savePreferencesAction).mockRejectedValueOnce(new Error("network down"));
    const { result } = renderHook(() =>
      useStore({
        habits: [],
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

    // When the user turns daily reminders off
    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.setPreferences({ remindersEnabled: false });
    });

    // Then the switch returns to its saved value and a failure toast appears
    expect(saved).toBe(false);
    expect(result.current.preferences.remindersEnabled).toBe(true);
    expect(result.current.toast?.msg).toBe("Couldn't save settings");
  });
});
