import { beforeEach, describe, expect, it, vi } from "vitest";

import { BACKUP_APP_MARKER, BACKUP_SCHEMA_VERSION } from "@/lib/contracts/backup";
import { mergeBackup } from "@/lib/backup/import";

/**
 * Build a mock Prisma transaction client. Every model method is a vi.fn with a
 * sensible default (no existing rows); individual tests override the few methods
 * whose return value they care about. `db.$transaction` simply runs the callback
 * with this tx, mirroring how the real client behaves for our purposes.
 */
function makeDb(overrides: Record<string, unknown> = {}) {
  const tx = {
    habit: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => [] as Array<{ id: string; stackNextId: string | null }>),
      upsert: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
    habitCheckIn: { upsert: vi.fn(async () => ({})) },
    habitNote: { findUnique: vi.fn(async () => null), upsert: vi.fn(async () => ({})) },
    habitContract: { upsert: vi.fn(async () => ({})) },
    journalEntry: { findUnique: vi.fn(async () => null), upsert: vi.fn(async () => ({})) },
    identityProfile: { upsert: vi.fn(async () => ({})) },
    userPreference: { upsert: vi.fn(async () => ({})) },
    weeklyReview: { upsert: vi.fn(async () => ({})) },
    lessonProgress: { upsert: vi.fn(async () => ({})) },
    formationVerdict: { upsert: vi.fn(async () => ({})) },
    ...overrides,
  };
  const db = { $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)) };
  return { db, tx };
}

function envelope(data: Record<string, unknown>) {
  return {
    app: BACKUP_APP_MARKER,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: "2026-06-21T00:00:00.000Z",
    data,
  };
}

function backupHabit(patch: Record<string, unknown> = {}) {
  return {
    id: "h1",
    name: "Read",
    identity: "reader",
    createdAt: "2026-06-01",
    history: {},
    notes: [],
    contractPartners: [],
    contract: "",
    ...patch,
  };
}

describe("mergeBackup", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/atomicly";
  });

  it("rejects a file that is not an Atomicly backup", async () => {
    // Given a foreign JSON file
    const { db, tx } = makeDb();
    // Then validation throws before any write happens
    await expect(mergeBackup("user_1", { app: "other", schemaVersion: 1, exportedAt: "x", data: {} }, db as never)).rejects.toThrow();
    expect(tx.habit.upsert).not.toHaveBeenCalled();
  });

  it("upserts habits, check-ins, notes and a contract with merge semantics", async () => {
    // Given a habit carrying mixed history, a note, and a contract
    const { db, tx } = makeDb();
    const file = envelope({
      habits: [
        backupHabit({
          contract: "Pay $5",
          contractPartners: ["Sam"],
          history: { "2026-06-01": true, "2026-06-02": { done: true, mood: 4, journal: "Nice" } },
          notes: [{ id: "n1", body: "Keep going", createdAt: "2026-06-02" }],
        }),
      ],
    });

    // When the backup is merged
    const summary = await mergeBackup("user_1", file, db as never);

    // Then each block is written and counted
    expect(tx.habit.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "h1" } }));
    expect(tx.habitCheckIn.upsert).toHaveBeenCalledTimes(2);
    expect(tx.habitNote.upsert).toHaveBeenCalledTimes(1);
    expect(tx.habitContract.upsert).toHaveBeenCalledTimes(1);
    expect(summary.habits).toBe(1);
    expect(summary.checkIns).toBe(2);
    expect(summary.notes).toBe(1);
    expect(summary.contracts).toBe(1);
  });

  it("never overwrites a habit owned by a different user", async () => {
    // Given an id that already belongs to someone else
    const { db, tx } = makeDb();
    tx.habit.findUnique.mockResolvedValue({ userId: "someone_else" } as never);
    const file = envelope({ habits: [backupHabit()] });

    // When merging
    const summary = await mergeBackup("user_1", file, db as never);

    // Then the habit is skipped, not written
    expect(tx.habit.upsert).not.toHaveBeenCalled();
    expect(summary.habits).toBe(0);
    expect(summary.skipped).toBe(1);
  });

  it("applies a safe stack link in the second pass", async () => {
    // Given two habits where h1 -> h2, and both end up owned by the user
    const { db, tx } = makeDb();
    tx.habit.findMany.mockResolvedValue([
      { id: "h1", stackNextId: null },
      { id: "h2", stackNextId: null },
    ] as never);
    const file = envelope({
      habits: [backupHabit({ id: "h1", stackNextId: "h2" }), backupHabit({ id: "h2", stackNextId: null })],
    });

    // When merging
    await mergeBackup("user_1", file, db as never);

    // Then the link is written exactly once, pointing h1 at h2
    expect(tx.habit.update).toHaveBeenCalledWith({ where: { id: "h1" }, data: { stackNextId: "h2" } });
  });

  it("skips a stack link whose target is already claimed by another habit", async () => {
    // Given h3 already points to h2 in the current graph
    const { db, tx } = makeDb();
    tx.habit.findMany.mockResolvedValue([
      { id: "h1", stackNextId: null },
      { id: "h2", stackNextId: null },
      { id: "h3", stackNextId: "h2" },
    ] as never);
    const file = envelope({ habits: [backupHabit({ id: "h1", stackNextId: "h2" })] });

    // When merging
    const summary = await mergeBackup("user_1", file, db as never);

    // Then h1's conflicting link is skipped rather than violating exclusivity
    expect(tx.habit.update).not.toHaveBeenCalled();
    expect(summary.skipped).toBeGreaterThanOrEqual(1);
  });

  it("skips a formation verdict whose habit is not present", async () => {
    // Given a verdict referencing a habit the user does not own
    const { db, tx } = makeDb();
    tx.habit.findFirst.mockResolvedValue(null);
    const file = envelope({
      formationVerdicts: [{ habitId: "ghost", score: 4, reflection: "", formed: true }],
    });

    // When merging
    const summary = await mergeBackup("user_1", file, db as never);

    // Then it is skipped to avoid a foreign-key failure
    expect(tx.formationVerdict.upsert).not.toHaveBeenCalled();
    expect(summary.formationVerdicts).toBe(0);
    expect(summary.skipped).toBe(1);
  });

  it("restores identity, preferences, weekly reviews and lessons", async () => {
    // Given a backup with the user-scoped reflection blocks
    const { db, tx } = makeDb();
    const file = envelope({
      identity: { statement: "I am a reader", values: ["growth"] },
      preferences: { theme: "dark", accentHue: 145 },
      weeklyReviews: [{ weekStartKey: "2026-06-01", wentWell: "ok", smallestFix: "", identityVote: "" }],
      completedLessons: [1, 2, 3],
    });

    // When merging
    const summary = await mergeBackup("user_1", file, db as never);

    // Then each is upserted and reflected in the summary
    expect(tx.identityProfile.upsert).toHaveBeenCalledTimes(1);
    expect(tx.userPreference.upsert).toHaveBeenCalledTimes(1);
    expect(tx.weeklyReview.upsert).toHaveBeenCalledTimes(1);
    expect(tx.lessonProgress.upsert).toHaveBeenCalledTimes(3);
    expect(summary.identity).toBe(true);
    expect(summary.preferences).toBe(true);
    expect(summary.weeklyReviews).toBe(1);
    expect(summary.lessons).toBe(3);
  });
});
