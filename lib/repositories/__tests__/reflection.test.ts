import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createJournalEntry,
  getIdentity,
  getPreferences,
  getStoreSnapshot,
  getWeeklyReview,
  listCompletedLessons,
  listFormationVerdicts,
  listJournalEntries,
  listWeeklyReviews,
  markLessonComplete,
  saveFormationVerdict,
  saveIdentity,
  savePreferences,
  saveWeeklyReview,
  updateJournalEntry,
} from "@/lib/repositories/reflection";

vi.mock("@/lib/repositories/habits", () => ({
  listHabits: vi.fn(async () => [{ id: "habit_1", name: "Read" }]),
}));

const dates = {
  created: new Date("2030-01-02T00:00:00.000Z"),
  updated: new Date("2030-01-07T00:00:00.000Z"),
  reviewed: new Date("2030-01-10T00:00:00.000Z"),
};

describe("reflection repositories", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/atomicly";
  });

  it("upserts identity and maps the returned domain shape", async () => {
    const db = {
      identityProfile: {
        upsert: vi.fn(async () => ({ statement: "I show up", values: ["Consistency"] })),
      },
    };

    await expect(getIdentity("user_1", db as never)).resolves.toEqual({ statement: "I show up", values: ["Consistency"] });
    await expect(saveIdentity("user_1", { statement: "I read", values: ["Focus"] }, db as never)).resolves.toEqual({ statement: "I show up", values: ["Consistency"] });

    expect(db.identityProfile.upsert).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { userId: "user_1" },
      create: { userId: "user_1", statement: "I read", values: ["Focus"] },
      update: { statement: "I read", values: ["Focus"] },
    }));
  });

  it("creates, lists, and updates journal entries scoped to the user", async () => {
    const record = { id: "journal_1", dateKey: "2030-01-02", title: "Win", body: "Read", mood: "good", tags: ["reading"] };
    const db = {
      journalEntry: {
        findMany: vi.fn(async () => [record]),
        create: vi.fn(async () => record),
        findFirst: vi.fn(async () => record),
        update: vi.fn(async () => ({ ...record, title: "Edited" })),
      },
    };

    await expect(listJournalEntries("user_1", db as never)).resolves.toEqual([{ id: "journal_1", date: "2030-01-02", title: "Win", body: "Read", mood: "good", tags: ["reading"] }]);
    await createJournalEntry("user_1", { dateKey: "2030-01-02", title: "Win", body: "Read", mood: "good", tags: [] }, db as never);
    await expect(updateJournalEntry("user_1", "journal_1", { title: "Edited" }, db as never)).resolves.toMatchObject({ title: "Edited" });

    expect(db.journalEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user_1" } }));
    expect(db.journalEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "user_1", dateKey: "2030-01-02" }) });
    expect(db.journalEntry.findFirst).toHaveBeenCalledWith({ where: { id: "journal_1", userId: "user_1" } });
  });

  it("returns null instead of updating another user's journal entry", async () => {
    const db = {
      journalEntry: {
        findFirst: vi.fn(async () => null),
        update: vi.fn(),
      },
    };

    await expect(updateJournalEntry("user_1", "journal_2", { title: "Edited" }, db as never)).resolves.toBeNull();

    expect(db.journalEntry.update).not.toHaveBeenCalled();
  });

  it("upserts weekly reviews and returns an empty review when absent", async () => {
    const record = { weekStartKey: "2030-01-01", wentWell: "A", smallestFix: "B", identityVote: "C", updatedAt: dates.updated };
    const db = {
      weeklyReview: {
        findUnique: vi.fn(async () => null),
        findMany: vi.fn(async () => [record]),
        upsert: vi.fn(async () => record),
      },
    };

    await expect(getWeeklyReview("user_1", "2030-01-01", db as never)).resolves.toEqual({ wentWell: "", smallestFix: "", identityVote: "" });
    await expect(listWeeklyReviews("user_1", db as never)).resolves.toEqual([{ ...record, updatedAt: dates.updated.toISOString() }]);
    await expect(saveWeeklyReview("user_1", { weekStartKey: "2030-01-01", wentWell: "A", smallestFix: "B", identityVote: "C" }, db as never)).resolves.toMatchObject({ weekStartKey: "2030-01-01" });

    expect(db.weeklyReview.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_weekStartKey: { userId: "user_1", weekStartKey: "2030-01-01" } },
    }));
  });

  it("lists and marks completed lessons with user-scoped unique keys", async () => {
    const db = {
      lessonProgress: {
        findMany: vi.fn(async () => [{ lessonId: 1 }, { lessonId: 3 }]),
        upsert: vi.fn(),
      },
    };

    await expect(listCompletedLessons("user_1", db as never)).resolves.toEqual([1, 3]);
    await expect(markLessonComplete("user_1", 3, db as never)).resolves.toEqual([1, 3]);

    expect(db.lessonProgress.upsert).toHaveBeenCalledWith({
      where: { userId_lessonId: { userId: "user_1", lessonId: 3 } },
      create: { userId: "user_1", lessonId: 3 },
      update: { completedAt: expect.any(Date) },
    });
  });

  it("upserts preferences with defaults and accepted patch values", async () => {
    const db = {
      userPreference: {
        upsert: vi.fn(async () => ({
          theme: "dark",
          accentHue: 145,
          remindersEnabled: false,
          weeklyReviewNudge: true,
          accountabilityNudge: true,
          onboardingSeen: true,
          lessonMode: "random",
          timezone: "Australia/Sydney",
        })),
      },
    };

    await expect(getPreferences("user_1", db as never)).resolves.toMatchObject({ theme: "dark", lessonMode: "random" });
    await expect(savePreferences("user_1", { lessonMode: "random" }, db as never)).resolves.toMatchObject({ timezone: "Australia/Sydney" });

    expect(db.userPreference.upsert).toHaveBeenLastCalledWith({
      where: { userId: "user_1" },
      create: { userId: "user_1", lessonMode: "random" },
      update: { lessonMode: "random" },
    });
  });

  it("lists and saves formation verdicts only for habits owned by the user", async () => {
    const record = {
      habitId: "habit_1",
      score: 4,
      reflection: "Stable",
      decision: "formed",
      reviewedAt: dates.reviewed,
    };
    const db = {
      formationVerdict: {
        findMany: vi.fn(async () => [record]),
        upsert: vi.fn(async () => record),
      },
      habit: {
        findFirst: vi.fn(async () => ({ id: "habit_1", userId: "user_1" })),
      },
    };

    await expect(listFormationVerdicts("user_1", db as never)).resolves.toEqual([{ habitId: "habit_1", score: 4, reflection: "Stable", formed: true, reviewedAt: dates.reviewed.toISOString() }]);
    await expect(saveFormationVerdict("user_1", { habitId: "habit_1", score: 4, reflection: "Stable", formed: true, reviewedAt: dates.reviewed.toISOString() }, db as never)).resolves.toMatchObject({ formed: true });

    expect(db.habit.findFirst).toHaveBeenCalledWith({ where: { id: "habit_1", userId: "user_1" } });
    expect(db.formationVerdict.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { habitId: "habit_1" },
      create: expect.objectContaining({ userId: "user_1", decision: "formed" }),
    }));
  });

  it("builds a store snapshot from all user-scoped reflection sources", async () => {
    const db = {
      journalEntry: { findMany: vi.fn(async () => []) },
      identityProfile: { upsert: vi.fn(async () => ({ statement: "I show up", values: [] })) },
      weeklyReview: {
        findUnique: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
      },
      lessonProgress: { findMany: vi.fn(async () => [{ lessonId: 2 }]) },
      formationVerdict: { findMany: vi.fn(async () => []) },
      userPreference: {
        upsert: vi.fn(async () => ({
          theme: "light",
          accentHue: 60,
          remindersEnabled: true,
          weeklyReviewNudge: true,
          accountabilityNudge: false,
          onboardingSeen: false,
          lessonMode: "sequential",
          timezone: "UTC",
        })),
      },
    };

    await expect(getStoreSnapshot("user_1", "2030-01-01", db as never)).resolves.toMatchObject({
      habits: [{ id: "habit_1" }],
      completedLessons: [2],
      identity: { statement: "I show up" },
    });
  });
});
