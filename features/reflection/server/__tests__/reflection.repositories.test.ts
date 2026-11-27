import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createJournalEntry,
  getIdentity,
  getWeeklyReview,
  listCompletedLessons,
  listJournalEntries,
  listWeeklyReviews,
  markLessonComplete,
  saveIdentity,
  saveWeeklyReview,
  updateJournalEntry,
} from "../../server";

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
});
