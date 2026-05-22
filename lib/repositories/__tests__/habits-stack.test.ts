import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyStackMutation } from "@/lib/repositories/habits";
import { isStackError } from "@/lib/stack-errors";

/**
 * Build a minimal in-memory Prisma-like client that can answer the queries
 * `applyStackMutation` performs:
 *   - `db.$transaction(fn)` runs the callback with a `tx` object.
 *   - `tx.habit.findMany({ where, include })` returns the habits for the user.
 *   - `tx.habit.update({ where: { id }, data: { stackNextId } })` writes a
 *     patch and enforces the `stackNextId @unique` constraint exactly the way
 *     the Prisma + Postgres pair would: if any *other* habit already has the
 *     same `stackNextId` value, throw a unique-constraint error. This catches
 *     ordering bugs in the patch generator.
 */
type FakeHabit = {
  id: string;
  userId: string;
  archivedAt: Date | null;
  stackNextId: string | null;
  name: string;
  emoji: string;
  cue: string;
  craving: string;
  response: string;
  reward: string;
  loopCue: string;
  loopCraving: string;
  loopResponse: string;
  loopReward: string;
  twoMin: string;
  identity: string;
  environment: string;
  schedule: string;
  time: string;
  createdAt: Date;
  checkIns: never[];
  notes: never[];
  contract: null;
};

function makeFakeHabit(id: string, stackNextId: string | null = null): FakeHabit {
  return {
    id,
    userId: "user_1",
    archivedAt: null,
    stackNextId,
    name: `Habit ${id}`,
    emoji: "•",
    cue: "",
    craving: "",
    response: "",
    reward: "",
    loopCue: "",
    loopCraving: "",
    loopResponse: "",
    loopReward: "",
    twoMin: "",
    identity: "tester",
    environment: "",
    schedule: "Daily",
    time: "Morning",
    createdAt: new Date("2030-01-01T00:00:00.000Z"),
    checkIns: [],
    notes: [],
    contract: null,
  };
}

function makeFakeDb(initial: FakeHabit[]) {
  const habits = initial.map((h) => ({ ...h }));
  const updates: Array<{ id: string; stackNextId: string | null }> = [];

  const tx = {
    habit: {
      findMany: vi.fn(
        async ({
          where,
        }: {
          where: { userId: string; archivedAt?: null; id?: { in: string[] } };
        }) => {
          return habits.filter((h) => {
            if (h.userId !== where.userId) return false;
            if (where.archivedAt === null && h.archivedAt !== null) return false;
            if (where.id?.in && !where.id.in.includes(h.id)) return false;
            return true;
          });
        },
      ),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { stackNextId: string | null };
        }) => {
          const target = habits.find((h) => h.id === where.id);
          if (!target) throw new Error(`Habit not found: ${where.id}`);
          if (data.stackNextId !== null && data.stackNextId !== undefined) {
            const conflict = habits.find(
              (h) => h.id !== where.id && h.stackNextId === data.stackNextId,
            );
            if (conflict) {
              // Simulate Postgres unique constraint violation.
              const err = new Error(
                `Unique constraint failed on the fields: (stackNextId). Conflict: ${conflict.id} already points to ${data.stackNextId}`,
              );
              (err as Error & { code?: string }).code = "P2002";
              throw err;
            }
          }
          target.stackNextId = data.stackNextId;
          updates.push({ id: where.id, stackNextId: data.stackNextId });
          return target;
        },
      ),
    },
  };

  type Tx = typeof tx;
  const db = {
    $transaction: vi.fn(async (fn: (txArg: Tx) => Promise<unknown>) => {
      const snapshot = habits.map((h) => ({ ...h }));
      try {
        return await fn(tx);
      } catch (error) {
        // Rollback: restore snapshot so the test can verify the no-op invariant.
        habits.splice(0, habits.length, ...snapshot);
        updates.length = 0;
        throw error;
      }
    }),
    habit: tx.habit,
  };

  return { db, tx, habits, updates };
}

describe("applyStackMutation (repository)", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/atomicly";
  });

  it("inserts a solo habit after a solo target in a single transaction", async () => {
    const { db, updates } = makeFakeDb([makeFakeHabit("a"), makeFakeHabit("b")]);

    const result = await applyStackMutation(
      "user_1",
      { kind: "insert", habitId: "a", position: "after", targetId: "b" },
      // The repository is typed against the real PrismaClient; cast for the fake.
      db as unknown as Parameters<typeof applyStackMutation>[2],
    );

    // Updates should occur in the safe order: target → habit first, then any
    // habit → previous-successor (none here because b had no successor).
    expect(updates).toEqual([{ id: "b", stackNextId: "a" }]);
    expect(result.map((r) => r.id).sort()).toEqual(["b"]);
  });

  it("rejects inserting a habit that already has a successor (source already in stack)", async () => {
    // a -> b. Try to insert a after c. Should fail because a is not solo.
    const { db, updates } = makeFakeDb([
      makeFakeHabit("a", "b"),
      makeFakeHabit("b"),
      makeFakeHabit("c"),
    ]);

    await expect(
      applyStackMutation(
        "user_1",
        { kind: "insert", habitId: "a", position: "after", targetId: "c" },
        db as unknown as Parameters<typeof applyStackMutation>[2],
      ),
    ).rejects.toSatisfy(isStackError);

    // No mutations should have leaked outside the transaction.
    expect(updates).toEqual([]);
  });

  it("rejects inserting a habit that has a predecessor (tail still in stack)", async () => {
    // a -> b. Try to insert b after c — b has a predecessor.
    const { db, updates } = makeFakeDb([
      makeFakeHabit("a", "b"),
      makeFakeHabit("b"),
      makeFakeHabit("c"),
    ]);

    await expect(
      applyStackMutation(
        "user_1",
        { kind: "insert", habitId: "b", position: "after", targetId: "c" },
        db as unknown as Parameters<typeof applyStackMutation>[2],
      ),
    ).rejects.toSatisfy(isStackError);

    expect(updates).toEqual([]);
  });

  it("rejects self-referential inserts", async () => {
    const { db } = makeFakeDb([makeFakeHabit("a")]);
    await expect(
      applyStackMutation(
        "user_1",
        { kind: "insert", habitId: "a", position: "after", targetId: "a" },
        db as unknown as Parameters<typeof applyStackMutation>[2],
      ),
    ).rejects.toSatisfy(isStackError);
  });

  it("does not violate the unique constraint when inserting in the middle of a chain", async () => {
    // p -> t. Insert h before t. Patches must be:
    //   1. p.stackNextId = h   (frees t)
    //   2. h.stackNextId = t
    // If they ran in the wrong order, p and h would both point to t at the
    // same time, tripping the unique constraint (fake db throws P2002).
    const { db, updates } = makeFakeDb([
      makeFakeHabit("p", "t"),
      makeFakeHabit("t"),
      makeFakeHabit("h"),
    ]);

    await applyStackMutation(
      "user_1",
      { kind: "insert", habitId: "h", position: "before", targetId: "t" },
      db as unknown as Parameters<typeof applyStackMutation>[2],
    );

    expect(updates).toEqual([
      { id: "p", stackNextId: "h" },
      { id: "h", stackNextId: "t" },
    ]);
  });

  it("removes a middle habit and re-links neighbours atomically", async () => {
    const { db, updates, habits } = makeFakeDb([
      makeFakeHabit("a", "b"),
      makeFakeHabit("b", "c"),
      makeFakeHabit("c"),
    ]);

    await applyStackMutation(
      "user_1",
      { kind: "remove", habitId: "b" },
      db as unknown as Parameters<typeof applyStackMutation>[2],
    );

    // Order matters: b must be freed before a is rewired to c.
    expect(updates).toEqual([
      { id: "b", stackNextId: null },
      { id: "a", stackNextId: "c" },
    ]);
    expect(habits.find((h) => h.id === "a")?.stackNextId).toBe("c");
    expect(habits.find((h) => h.id === "b")?.stackNextId).toBeNull();
  });

  it("inserts a solo habit after a mid-chain target (a -> b -> c, add s after b)", async () => {
    // Chain a -> b -> c. Insert solo s after b. Expected chain: a -> b -> s -> c.
    // Patches must be ordered:
    //   1. b.stackNextId = s   (frees c)
    //   2. s.stackNextId = c
    // The fake DB would throw P2002 if both b and s pointed to c at once.
    const { db, updates, habits } = makeFakeDb([
      makeFakeHabit("a", "b"),
      makeFakeHabit("b", "c"),
      makeFakeHabit("c"),
      makeFakeHabit("s"),
    ]);

    await applyStackMutation(
      "user_1",
      { kind: "insert", habitId: "s", position: "after", targetId: "b" },
      db as unknown as Parameters<typeof applyStackMutation>[2],
    );

    expect(updates).toEqual([
      { id: "b", stackNextId: "s" },
      { id: "s", stackNextId: "c" },
    ]);
    expect(habits.find((h) => h.id === "a")?.stackNextId).toBe("b");
    expect(habits.find((h) => h.id === "b")?.stackNextId).toBe("s");
    expect(habits.find((h) => h.id === "s")?.stackNextId).toBe("c");
    expect(habits.find((h) => h.id === "c")?.stackNextId).toBeNull();
  });

  it("inserts a solo habit before the chain root (r -> t, add s before r)", async () => {
    // Chain r -> t. Insert solo s before r (which has no predecessor).
    // Expected: s -> r -> t. Only one patch — link s -> r.
    const { db, updates, habits } = makeFakeDb([
      makeFakeHabit("r", "t"),
      makeFakeHabit("t"),
      makeFakeHabit("s"),
    ]);

    await applyStackMutation(
      "user_1",
      { kind: "insert", habitId: "s", position: "before", targetId: "r" },
      db as unknown as Parameters<typeof applyStackMutation>[2],
    );

    expect(updates).toEqual([{ id: "s", stackNextId: "r" }]);
    expect(habits.find((h) => h.id === "s")?.stackNextId).toBe("r");
    expect(habits.find((h) => h.id === "r")?.stackNextId).toBe("t");
    expect(habits.find((h) => h.id === "t")?.stackNextId).toBeNull();
  });

  it("inserts a solo habit after the chain tail (r -> t, add s after t)", async () => {
    // Chain r -> t. Insert solo s after the tail t (which has no successor).
    // Expected: r -> t -> s. Only one patch — link t -> s.
    const { db, updates, habits } = makeFakeDb([
      makeFakeHabit("r", "t"),
      makeFakeHabit("t"),
      makeFakeHabit("s"),
    ]);

    await applyStackMutation(
      "user_1",
      { kind: "insert", habitId: "s", position: "after", targetId: "t" },
      db as unknown as Parameters<typeof applyStackMutation>[2],
    );

    expect(updates).toEqual([{ id: "t", stackNextId: "s" }]);
    expect(habits.find((h) => h.id === "r")?.stackNextId).toBe("t");
    expect(habits.find((h) => h.id === "t")?.stackNextId).toBe("s");
    expect(habits.find((h) => h.id === "s")?.stackNextId).toBeNull();
  });

  it("rolls back all updates on a failed transaction", async () => {
    // Force the SECOND update inside the transaction to throw. With the
    // rollback behaviour of the fake db, the first update is reverted.
    const { db, habits } = makeFakeDb([
      makeFakeHabit("p", "t"),
      makeFakeHabit("t"),
      makeFakeHabit("h"),
    ]);
    let calls = 0;
    const originalUpdate = db.habit.update;
    db.habit.update = vi.fn(async (args) => {
      calls += 1;
      if (calls === 2) {
        throw new Error("simulated downstream failure");
      }
      return originalUpdate(args);
    });

    await expect(
      applyStackMutation(
        "user_1",
        { kind: "insert", habitId: "h", position: "before", targetId: "t" },
        db as unknown as Parameters<typeof applyStackMutation>[2],
      ),
    ).rejects.toThrow(/simulated downstream failure/);

    expect(habits.find((h) => h.id === "p")?.stackNextId).toBe("t");
    expect(habits.find((h) => h.id === "h")?.stackNextId).toBeNull();
  });
});
