import { beforeEach, describe, expect, it, vi } from "vitest";

import { getStoreSnapshot } from "@/lib/server/store-snapshot";

// Only `listHabits` is stubbed; every other repository runs for real against
// the hand-built mock Prisma client below.
vi.mock("@/features/habits/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/habits/server")>()),
  listHabits: vi.fn(async () => [{ id: "habit_1", name: "Read" }]),
}));

describe("store snapshot composition", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/atomicly";
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
      pet: { findMany: vi.fn(async () => []) },
      petFeedLog: { aggregate: vi.fn(async () => ({ _sum: { amount: null } })) },
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
