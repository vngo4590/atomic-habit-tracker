import { beforeEach, describe, expect, it, vi } from "vitest";

import { getHabit, updateHabit } from "@/lib/repositories/habits";
import { saveFormationVerdict } from "@/lib/repositories/reflection";

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
