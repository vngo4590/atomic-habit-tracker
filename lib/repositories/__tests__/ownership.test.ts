import { beforeEach, describe, expect, it, vi } from "vitest";

import { addNote, archiveHabit, createHabit, getHabit, listHabits, saveContract, updateHabit, upsertCheckIn } from "@/lib/repositories/habits";
import { saveFormationVerdict } from "@/lib/repositories/reflection";

const habitRecord = {
  id: "habit_b",
  name: "Read",
  emoji: "*",
  cue: "After coffee",
  craving: "Feel clear",
  response: "Read one page",
  reward: "Mark it done",
  loopCue: "Coffee",
  loopCraving: "Clarity",
  loopResponse: "Read",
  loopReward: "Streak",
  twoMin: "Open book",
  stack: "After coffee",
  identity: "reader",
  environment: "Desk",
  schedule: "Daily",
  time: "Morning",
  createdAt: new Date("2030-01-01T00:00:00.000Z"),
  checkIns: [{ dateKey: "2030-01-02", done: true, mood: 5, journal: "Good" }],
  notes: [{ id: "note_1", body: "Keep the book visible", createdAt: new Date("2030-01-02T00:00:00.000Z") }],
  contract: { terms: "Pay $5", partners: ["Ada"] },
};

describe("repository ownership boundaries", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/atomicly";
  });

  it("scopes habit detail reads by user id", async () => {
    const db = {
      habit: {
        findFirst: vi.fn(async () => null),
      },
    };

    await getHabit("user_a", "habit_b", db as never);

    expect(db.habit.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "habit_b",
          userId: "user_a",
        }),
      }),
    );
  });

  it("lists only active habits for the user and maps persisted records to domain shape", async () => {
    const db = {
      habit: {
        findMany: vi.fn(async () => [habitRecord]),
      },
    };

    const result = await listHabits("user_a", db as never);

    expect(db.habit.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user_a", archivedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }));
    expect(result[0]).toMatchObject({
      id: "habit_b",
      contract: "Pay $5",
      contractPartners: ["Ada"],
      history: { "2030-01-02": { done: true, mood: 5, journal: "Good" } },
      notes: [{ id: "note_1", body: "Keep the book visible", createdAt: "2030-01-02" }],
      createdAt: "2030-01-01",
    });
  });

  it("creates habits with owner fields and optional contract data", async () => {
    const db = {
      habit: {
        create: vi.fn(async () => habitRecord),
      },
    };

    await createHabit("user_a", {
      name: "Read",
      emoji: "*",
      cue: "",
      craving: "",
      response: "Read",
      reward: "",
      loopCue: "",
      loopCraving: "",
      loopResponse: "",
      loopReward: "",
      twoMin: "",
      stack: "",
      identity: "reader",
      environment: "",
      schedule: "Daily",
      time: "Morning",
      contract: "Pay $5",
      contractPartners: ["Ada"],
    }, db as never);

    expect(db.habit.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: "user_a",
        name: "Read",
        contract: { create: { userId: "user_a", terms: "Pay $5", partners: ["Ada"] } },
      }),
    }));
  });

  it("does not update a habit that is not visible to the user", async () => {
    const db = {
      habit: {
        findFirst: vi.fn(async () => null),
        update: vi.fn(),
      },
    };

    const result = await updateHabit("user_a", "habit_b", { name: "Renamed" }, db as never);

    expect(result).toBeNull();
    expect(db.habit.update).not.toHaveBeenCalled();
  });

  it("updates habit contracts and notes using user-owned records", async () => {
    const updatedRecord = { ...habitRecord, name: "Renamed" };
    const db = {
      habit: {
        findFirst: vi.fn(async () => habitRecord),
        update: vi.fn(async () => updatedRecord),
      },
      habitContract: {
        upsert: vi.fn(),
      },
      habitNote: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
    };

    await updateHabit("user_a", "habit_b", {
      name: "Renamed",
      contract: "New terms",
      contractPartners: ["Grace"],
      notes: [{ id: "note_2", body: "New note", createdAt: "2030-01-03" }],
    }, db as never);

    expect(db.habit.update).toHaveBeenCalledWith({ where: { id: "habit_b" }, data: { name: "Renamed" } });
    expect(db.habitContract.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { habitId: "habit_b" },
      create: expect.objectContaining({ userId: "user_a", partners: ["Grace"] }),
    }));
    expect(db.habitNote.deleteMany).toHaveBeenCalledWith({ where: { userId: "user_a", habitId: "habit_b" } });
    expect(db.habitNote.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ userId: "user_a", habitId: "habit_b", body: "New note" })] });
  });

  it("archives visible habits without deleting them", async () => {
    const db = {
      habit: {
        findFirst: vi.fn(async () => habitRecord),
        update: vi.fn(),
      },
    };

    const result = await archiveHabit("user_a", "habit_b", db as never);

    expect(result?.id).toBe("habit_b");
    expect(db.habit.update).toHaveBeenCalledWith({ where: { id: "habit_b" }, data: { archivedAt: expect.any(Date) } });
  });

  it("upserts or clears daily check-ins only after habit ownership is confirmed", async () => {
    const db = {
      habit: {
        findFirst: vi.fn()
          .mockResolvedValueOnce(habitRecord)
          .mockResolvedValueOnce(habitRecord)
          .mockResolvedValueOnce(habitRecord)
          .mockResolvedValueOnce(habitRecord),
      },
      habitCheckIn: {
        upsert: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    await upsertCheckIn("user_a", "habit_b", { dateKey: "2030-01-04", done: true, mood: 4, journal: "Done" }, db as never);
    await upsertCheckIn("user_a", "habit_b", { dateKey: "2030-01-04", done: false }, db as never);

    expect(db.habitCheckIn.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { habitId_dateKey: { habitId: "habit_b", dateKey: "2030-01-04" } },
      create: expect.objectContaining({ userId: "user_a", habitId: "habit_b", mood: 4, journal: "Done" }),
    }));
    expect(db.habitCheckIn.deleteMany).toHaveBeenCalledWith({ where: { userId: "user_a", habitId: "habit_b", dateKey: "2030-01-04" } });
  });

  it("adds notes and saves contracts through the same ownership gate", async () => {
    const db = {
      habit: {
        findFirst: vi.fn(async () => habitRecord),
        update: vi.fn(),
      },
      habitNote: {
        create: vi.fn(),
      },
      habitContract: {
        upsert: vi.fn(),
      },
    };

    await addNote("user_a", "habit_b", "  New note  ", db as never);
    await saveContract("user_a", "habit_b", { terms: "Terms", partners: ["Ada"] }, db as never);

    expect(db.habitNote.create).toHaveBeenCalledWith({ data: { userId: "user_a", habitId: "habit_b", body: "New note" } });
    expect(db.habitContract.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ userId: "user_a", habitId: "habit_b", terms: "Terms", partners: ["Ada"] }),
    }));
  });

  it("does not save formation verdicts for another user's habit", async () => {
    const db = {
      habit: {
        findFirst: vi.fn(async () => null),
      },
      formationVerdict: {
        upsert: vi.fn(),
      },
    };

    const result = await saveFormationVerdict(
      "user_a",
      {
        habitId: "habit_b",
        score: 4,
        reflection: "",
        formed: true,
        reviewedAt: new Date().toISOString(),
      },
      db as never,
    );

    expect(result).toBeNull();
    expect(db.habit.findFirst).toHaveBeenCalledWith({ where: { id: "habit_b", userId: "user_a" } });
    expect(db.formationVerdict.upsert).not.toHaveBeenCalled();
  });
});
