import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  adoptPet,
  buryPet,
  countEarnedFoodToday,
  deletePet,
  feedPet,
  listPets,
  MAX_ALIVE_PETS,
} from "@/lib/repositories/pets";
import { FOOD_PER_HABIT, MAX_SATIETY } from "@/lib/pet";

/**
 * Integration tests for the pet repository against a hand-built mock Prisma
 * client. These verify the *business rules* that the repository alone enforces:
 * the alive cap, the monthly adoption limit, the shared daily food pool (now fed
 * by habits *and* journalling), satiety clamping, evolution triggering, permanent
 * death, and release/delete — none of which the pure engine can guarantee on its
 * own because they depend on persisted state.
 */

const DAY = "2030-01-01";
const NOW = Date.UTC(2030, 0, 1, 12, 0, 0);

/** Build a database-shaped pet row with sensible, alive-at-`NOW` defaults. */
function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  const at = new Date(NOW);
  return {
    id: "pet_1",
    userId: "user_1",
    name: "Pip",
    temperament: "calm",
    seed: 12345,
    totalFeeds: 0,
    satiety: 2,
    health: 100,
    bornAt: at,
    lastFedAt: at,
    lastSimAt: at,
    isAlive: true,
    diedAt: null,
    createdAt: at,
    ...overrides,
  };
}

/**
 * A minimal mock Prisma client. Each test wires only the knobs it needs. The
 * count mocks inspect their `where` clause so a single model can answer several
 * distinct questions (alive-count vs born-this-month; habit completions vs habit
 * journal notes).
 */
function makeDb(opts: {
  row?: ReturnType<typeof makeRow> | null;
  feedLogSum?: number | null;
  completedHabits?: number;
  habitJournals?: number;
  journalEntries?: number;
  weeklyReviews?: number;
  aliveCount?: number;
  bornThisMonth?: number;
} = {}) {
  const pet = {
    findFirst: vi.fn(async () => opts.row ?? null),
    findMany: vi.fn(async () => (opts.row ? [opts.row] : [])),
    count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      // The adoption guard asks two different questions of the Pet table.
      if (where?.bornAt) return opts.bornThisMonth ?? 0;
      return opts.aliveCount ?? 0;
    }),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => makeRow({ id: "pet_new", ...data })),
    update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => makeRow({ ...opts.row, ...data })),
    delete: vi.fn(async () => opts.row),
  };
  const petFeedLog = {
    aggregate: vi.fn(async () => ({ _sum: { amount: opts.feedLogSum ?? null } })),
    create: vi.fn(async () => ({})),
  };
  const habitCheckIn = {
    count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      // A check-in with a `journal` filter counts journal notes; otherwise completions.
      if (where?.journal) return opts.habitJournals ?? 0;
      return opts.completedHabits ?? 0;
    }),
  };
  const journalEntry = { count: vi.fn(async () => opts.journalEntries ?? 0) };
  const weeklyReview = { count: vi.fn(async () => opts.weeklyReviews ?? 0) };
  return { pet, petFeedLog, habitCheckIn, journalEntry, weeklyReview } as never;
}

describe("pet repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/atomicly";
  });

  describe("adoptPet", () => {
    // Given the ecosystem already holds the maximum number of alive pets,
    // When a user tries to adopt another,
    // Then the cap is enforced with a friendly error so the world stays bounded.
    it("rejects adoption when the alive cap is reached", async () => {
      const db = makeDb({ aliveCount: MAX_ALIVE_PETS });
      await expect(adoptPet("user_1", { name: "New", temperament: "fiery" }, NOW, db)).rejects.toThrow(/at most/);
    });

    // Given a pet was already born this calendar month,
    // When the user tries to adopt another,
    // Then the monthly adoption limit blocks it.
    it("rejects a second adoption within the same month", async () => {
      const db = makeDb({ aliveCount: 0, bornThisMonth: 1 });
      await expect(adoptPet("user_1", { name: "Two", temperament: "calm" }, NOW, db)).rejects.toThrow(/one pet per month/);
    });

    // Given room in the ecosystem and no adoption yet this month,
    // When a user adopts a pet of a chosen temperament,
    // Then a fresh, seeded creature is created and returned.
    it("creates a seeded pet when there is room and no adoption this month", async () => {
      const db = makeDb({ aliveCount: 1, bornThisMonth: 0 });
      const pet = await adoptPet("user_1", { name: "Ember", temperament: "fiery" }, NOW, db);
      expect(pet.temperament).toBe("fiery");
      expect(pet.isAlive).toBe(true);
    });
  });

  describe("countEarnedFoodToday — food sources", () => {
    // Given one completed habit and one of each reflective activity today,
    // When we total the day's food,
    // Then habits are worth FOOD_PER_HABIT and each reflection worth one extra.
    it("totals habits (x3) plus journalling (x1 each)", async () => {
      const db = makeDb({ completedHabits: 1, journalEntries: 1, habitJournals: 1, weeklyReviews: 1 });
      const total = await countEarnedFoodToday("user_1", DAY, NOW, db);
      expect(total).toBe(FOOD_PER_HABIT + 3);
    });
  });

  describe("feedPet — shared food pool", () => {
    // SCENARIO: the user does not complete any habit and does not journal.
    // Given no food earned today,
    // When the user tries to feed,
    // Then there is no food and the feed is refused.
    it("refuses to feed when no food is available", async () => {
      const db = makeDb({ row: makeRow(), completedHabits: 0, feedLogSum: 0 });
      const result = await feedPet("user_1", "pet_1", 2, DAY, NOW, db);
      expect(result).toMatchObject({ ok: false, reason: "no_food" });
    });

    // SCENARIO: the user completes a habit and then feeds the pet.
    // Given one completed habit (3 food) and an empty pet,
    // When the user feeds 3,
    // Then all three units are spent and logged.
    it("feeds from habit completions (3 food per habit)", async () => {
      const db = makeDb({ row: makeRow({ satiety: 0 }), completedHabits: 1, feedLogSum: 0 });
      const result = await feedPet("user_1", "pet_1", 3, DAY, NOW, db);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.fedAmount).toBe(3);
      expect((db as never as { petFeedLog: { create: ReturnType<typeof vi.fn> } }).petFeedLog.create)
        .toHaveBeenCalledWith({ data: { userId: "user_1", petId: "pet_1", dateKey: DAY, amount: 3 } });
    });

    // Given the user only journalled (no habit) earning a single unit,
    // When the user feeds,
    // Then journalling alone funds one feed.
    it("feeds from journalling alone", async () => {
      const db = makeDb({ row: makeRow({ satiety: 0 }), completedHabits: 0, journalEntries: 1, feedLogSum: 0 });
      const result = await feedPet("user_1", "pet_1", 2, DAY, NOW, db);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.fedAmount).toBe(1);
    });

    // Given more food earned than spent but little left in the pool,
    // When the user over-asks,
    // Then the fed amount is clamped to the remaining pool.
    it("clamps the fed amount to the remaining food pool", async () => {
      const db = makeDb({ row: makeRow({ satiety: 0 }), completedHabits: 1, feedLogSum: 2 });
      const result = await feedPet("user_1", "pet_1", 5, DAY, NOW, db);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.fedAmount).toBe(1); // 3 earned - 2 spent = 1 left
    });

    // Given plenty of food but a nearly-full pet,
    // When the user over-asks,
    // Then the fed amount is clamped to the pet's remaining capacity.
    it("clamps the fed amount to remaining satiety capacity", async () => {
      const db = makeDb({ row: makeRow({ satiety: 1 }), completedHabits: 5, feedLogSum: 0 });
      const result = await feedPet("user_1", "pet_1", 5, DAY, NOW, db);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.fedAmount).toBe(MAX_SATIETY - 1);
    });

    // Given a pet that is already full,
    // When the user feeds it,
    // Then the feed is refused as "full" rather than wasting food.
    it("refuses to overfeed a full pet", async () => {
      const db = makeDb({ row: makeRow({ satiety: MAX_SATIETY }), completedHabits: 5, feedLogSum: 0 });
      const result = await feedPet("user_1", "pet_1", 2, DAY, NOW, db);
      expect(result).toMatchObject({ ok: false, reason: "full" });
    });

    // Given a hatch-ready pet at 0 feeds,
    // When it is fed enough to cross the first stage threshold,
    // Then the result flags that it evolved.
    it("reports evolution when a feed crosses a stage threshold", async () => {
      const db = makeDb({ row: makeRow({ satiety: 0, totalFeeds: 0 }), completedHabits: 4, feedLogSum: 0 });
      const result = await feedPet("user_1", "pet_1", 1, DAY, NOW, db);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.evolved).toBe(true);
    });

    // Given a pet that has already died,
    // When the user tries to feed it,
    // Then feeding is refused because death is permanent.
    it("refuses to feed a dead pet", async () => {
      const db = makeDb({ row: makeRow({ isAlive: false, health: 0, diedAt: new Date(NOW) }) });
      const result = await feedPet("user_1", "pet_1", 1, DAY, NOW, db);
      expect(result).toMatchObject({ ok: false, reason: "dead" });
    });

    // Given an unknown pet id,
    // When feeding,
    // Then the repository reports not_found rather than throwing.
    it("returns not_found for a missing pet", async () => {
      const db = makeDb({ row: null });
      const result = await feedPet("user_1", "ghost", 1, DAY, NOW, db);
      expect(result).toMatchObject({ ok: false, reason: "not_found" });
    });
  });

  describe("listPets — simulate on read", () => {
    // SCENARIO: the user completes habits but forgets to feed for weeks.
    // Given a long-neglected pet whose health has run out,
    // When the ecosystem is read,
    // Then its death is persisted permanently — completing habits alone never feeds.
    it("persists death for a starved pet", async () => {
      const longAgo = new Date(NOW - 30 * 24 * 60 * 60 * 1000); // 30 days back
      const row = makeRow({ satiety: 0, health: 1, lastSimAt: longAgo, lastFedAt: longAgo, bornAt: longAgo });
      const db = makeDb({ row });
      const pets = await listPets("user_1", NOW, db);
      expect(pets[0].isAlive).toBe(false);
      expect((db as never as { pet: { update: ReturnType<typeof vi.fn> } }).pet.update).toHaveBeenCalled();
    });

    // Given a recently-fed pet,
    // When the ecosystem is read soon after,
    // Then it is still alive (gentle decay keeps a daily-fed pet safe).
    it("keeps a recently-fed pet alive", async () => {
      const db = makeDb({ row: makeRow({ satiety: 2, lastSimAt: new Date(NOW) }) });
      const pets = await listPets("user_1", NOW, db);
      expect(pets[0].isAlive).toBe(true);
    });
  });

  describe("buryPet", () => {
    // Given a living pet,
    // When the user tries to bury it,
    // Then the action is refused — only the dead may be laid to rest.
    it("refuses to bury a living pet", async () => {
      const db = makeDb({ row: makeRow() });
      await expect(buryPet("user_1", "pet_1", NOW, db)).rejects.toThrow(/after it has passed/);
    });

    // Given a dead pet,
    // When the user buries it,
    // Then it is deleted and the call reports success.
    it("buries a dead pet", async () => {
      const db = makeDb({ row: makeRow({ isAlive: false, health: 0, diedAt: new Date(NOW) }) });
      await expect(buryPet("user_1", "pet_1", NOW, db)).resolves.toBe(true);
      expect((db as never as { pet: { delete: ReturnType<typeof vi.fn> } }).pet.delete).toHaveBeenCalled();
    });
  });

  describe("deletePet", () => {
    // Given a living pet,
    // When the user releases it,
    // Then it is deleted unconditionally (freeing the monthly + alive slots).
    it("releases a living pet", async () => {
      const db = makeDb({ row: makeRow() });
      await expect(deletePet("user_1", "pet_1", db)).resolves.toBe(true);
      expect((db as never as { pet: { delete: ReturnType<typeof vi.fn> } }).pet.delete).toHaveBeenCalled();
    });

    // Given an unknown pet id,
    // When releasing,
    // Then nothing is deleted and the call reports false.
    it("returns false for a missing pet", async () => {
      const db = makeDb({ row: null });
      await expect(deletePet("user_1", "ghost", db)).resolves.toBe(false);
      expect((db as never as { pet: { delete: ReturnType<typeof vi.fn> } }).pet.delete).not.toHaveBeenCalled();
    });
  });
});
