import { beforeEach, describe, expect, it, vi } from "vitest";

import { listFormationVerdicts, saveFormationVerdict } from "../verdicts.repository";

const dates = {
  reviewed: new Date("2030-01-10T00:00:00.000Z"),
};

describe("formation verdict repository", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/atomicly";
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
});
