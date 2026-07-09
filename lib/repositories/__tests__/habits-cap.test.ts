import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_ACTIVE_HABITS } from "@/lib/habit-cap";
import { countActiveHabits, createHabit } from "@/lib/repositories/habits";

const habitRecord = {
  id: "habit_new",
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
  identity: "reader",
  environment: "",
  schedule: "Daily",
  time: "Morning",
  createdAt: new Date("2030-01-01T00:00:00.000Z"),
  checkIns: [],
  notes: [],
  contract: null,
};

const validInput = {
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
  identity: "reader",
  environment: "",
  schedule: "Daily",
  time: "Morning",
  contract: "",
  contractPartners: [] as string[],
};

describe("active-habit cap enforcement", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/atomicly";
  });

  // -------------------------------------------------------------------------
  // countActiveHabits — the authoritative predicate
  // -------------------------------------------------------------------------
  describe("countActiveHabits", () => {
    it("counts only non-archived, non-inducted habits", async () => {
      // Given: a db whose count reflects the active subset
      const db = { habit: { count: vi.fn(async () => 2) } };

      // When: counting active habits
      const count = await countActiveHabits("user_1", db as never);

      // Then: the where-clause excludes archived and formed habits
      expect(count).toBe(2);
      expect(db.habit.count).toHaveBeenCalledWith({
        where: {
          userId: "user_1",
          archivedAt: null,
          verdicts: { none: { decision: "formed" } },
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // createHabit — the discriminated result + cap gate
  // -------------------------------------------------------------------------
  describe("createHabit", () => {
    it("creates the habit and returns a success result when under the cap", async () => {
      // Given: the user is below the cap
      const db = {
        habit: {
          count: vi.fn(async () => MAX_ACTIVE_HABITS - 1),
          create: vi.fn(async () => habitRecord),
        },
      };

      // When: creating a habit
      const result = await createHabit("user_1", validInput, db as never);

      // Then: it succeeds and the row is written
      expect(result).toEqual({ ok: true, habit: expect.objectContaining({ id: "habit_new" }) });
      expect(db.habit.create).toHaveBeenCalledTimes(1);
    });

    it("refuses with reason 'cap' and writes nothing when at the cap", async () => {
      // Given: the user already has the maximum active habits
      const db = {
        habit: {
          count: vi.fn(async () => MAX_ACTIVE_HABITS),
          create: vi.fn(async () => habitRecord),
        },
      };

      // When: attempting to create a fourth active habit
      const result = await createHabit("user_1", validInput, db as never);

      // Then: it is refused and no habit is created
      expect(result).toEqual({ ok: false, reason: "cap" });
      expect(db.habit.create).not.toHaveBeenCalled();
    });

    it("refuses when above the cap (grandfathered data) without archiving anything", async () => {
      // Given: a pre-existing user with more than the cap allows
      const db = {
        habit: {
          count: vi.fn(async () => MAX_ACTIVE_HABITS + 2),
          create: vi.fn(async () => habitRecord),
          update: vi.fn(),
        },
      };

      // When: attempting to create a new habit
      const result = await createHabit("user_1", validInput, db as never);

      // Then: it is refused and nothing is mutated (no force-archive)
      expect(result).toEqual({ ok: false, reason: "cap" });
      expect(db.habit.create).not.toHaveBeenCalled();
      expect(db.habit.update).not.toHaveBeenCalled();
    });
  });
});
