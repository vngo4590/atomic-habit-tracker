/**
 * pets.ts — Prisma data access for the pet ecosystem.
 *
 * This repository is the single place that reads and writes pets. It is also the
 * authoritative home of two rules that must never be bypassed:
 *   1. The ecosystem cap — a user may keep at most MAX_ALIVE_PETS alive at once.
 *   2. The shared daily food pool — feeds are funded by habit completions today
 *      and spent across ALL pets, tracked via PetFeedLog rows.
 *
 * "Simulate on read": because pets decay in real time, every read advances each
 * pet's vitals to *now* and, if a pet has died since we last looked, persists
 * that death so it becomes permanent. Alive pets are returned at their stored
 * checkpoint so the client can keep simulating smoothly from the same anchor.
 */

import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import { petAdoptSchema, type PetAdoptInput } from "@/lib/contracts/pet";
import { logger, redactUserId } from "@/lib/logger";
import { didEvolve } from "@/lib/pet/evolution";
import { MAX_ALIVE_PETS, earnedFoodFrom } from "@/lib/pet";
import { randomSeed } from "@/lib/pet/genome";
import {
  feedVitals,
  initialVitals,
  satietyCapacity,
  simulatePet,
  tuningFor,
  type PetVitals,
} from "@/lib/pet/simulation";
import type { Pet } from "@/lib/types";

type DbClient = typeof defaultDb;

/** The shape of a raw Prisma `Pet` row (the fields we read). */
type PetRow = {
  id: string;
  name: string;
  temperament: string;
  seed: number;
  totalFeeds: number;
  satiety: number;
  health: number;
  bornAt: Date;
  lastFedAt: Date;
  lastSimAt: Date;
  isAlive: boolean;
  diedAt: Date | null;
};

/** The maximum number of *alive* pets a user may keep at once (re-exported from
 * the engine so the cap is defined in exactly one place). */
export { MAX_ALIVE_PETS };

const log = logger.child({ module: "repo.pets" });

/** Map a raw database row into the serialisable `Pet` shape used by the store. */
function toPet(row: PetRow): Pet {
  return {
    id: row.id,
    name: row.name,
    temperament: row.temperament,
    seed: row.seed,
    totalFeeds: row.totalFeeds,
    satiety: row.satiety,
    health: row.health,
    bornAt: row.bornAt.toISOString(),
    lastFedAt: row.lastFedAt.toISOString(),
    lastSimAt: row.lastSimAt.toISOString(),
    isAlive: row.isAlive,
    diedAt: row.diedAt ? row.diedAt.toISOString() : null,
  };
}

/** Build the simulation's `PetVitals` from a database row (dates -> epoch ms). */
function vitalsFromRow(row: PetRow): PetVitals {
  return {
    satiety: row.satiety,
    health: row.health,
    lastSimAt: row.lastSimAt.getTime(),
    lastFedAt: row.lastFedAt.getTime(),
    bornAt: row.bornAt.getTime(),
    isAlive: row.isAlive,
    diedAt: row.diedAt ? row.diedAt.getTime() : null,
  };
}

/**
 * If a pet has died since its last checkpoint, persist that death (permanently)
 * and return the updated row. Alive pets are returned unchanged at their stored
 * checkpoint so the client can keep simulating from the same anchor.
 */
async function persistDeathIfNeeded(row: PetRow, now: number, db: DbClient): Promise<PetRow> {
  if (!row.isAlive) {
    return row;
  }
  const simulated = simulatePet(vitalsFromRow(row), tuningFor(row.temperament), now);
  if (simulated.isAlive) {
    return row;
  }

  log.info("Pet died of neglect", { event: "pet.died", petId: row.id });
  const updated = await db.pet.update({
    where: { id: row.id },
    data: {
      isAlive: false,
      health: 0,
      satiety: 0,
      diedAt: simulated.diedAt ? new Date(simulated.diedAt) : new Date(now),
      lastSimAt: simulated.diedAt ? new Date(simulated.diedAt) : new Date(now),
    },
  });
  return updated as PetRow;
}

/** Sum of all feeds spent by a user today — the consumed half of the food pool. */
export async function countFeedsUsedToday(userId: string, dateKey: string, db: DbClient = defaultDb): Promise<number> {
  validateDatabaseUrl();
  const aggregate = await db.petFeedLog.aggregate({
    _sum: { amount: true },
    where: { userId, dateKey },
  });
  return aggregate._sum.amount ?? 0;
}

/** Count habits the user completed today — the primary half of the food pool. */
async function countCompletedHabitsToday(userId: string, dateKey: string, db: DbClient): Promise<number> {
  return db.habitCheckIn.count({ where: { userId, dateKey, done: true } });
}

/**
 * The inclusive local-day window [start, end) that contains `now`, used to count
 * activities (like weekly reviews) that are stamped by `updatedAt` rather than a
 * YYYY-MM-DD dateKey.
 */
function localDayWindow(now: number): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * Total food the user has EARNED today across every source: completed habits
 * (worth the most) plus reflective activities (Journal entries, habit journal
 * notes, and weekly reviews) — each worth a little extra. This is the authoritative
 * server-side mirror of the pure `earnedFoodFrom` formula the client also uses.
 */
export async function countEarnedFoodToday(
  userId: string,
  dateKey: string,
  now: number,
  db: DbClient = defaultDb,
): Promise<number> {
  validateDatabaseUrl();
  const { start, end } = localDayWindow(now);

  const [habitsCompleted, journalEntries, habitJournals, weeklyReviews] = await Promise.all([
    countCompletedHabitsToday(userId, dateKey, db),
    db.journalEntry.count({ where: { userId, dateKey } }),
    // A habit check-in counts as journalling only when it actually carries a note.
    db.habitCheckIn.count({ where: { userId, dateKey, journal: { not: null } } }),
    // Weekly reviews have no dateKey, so we count those saved within today's window.
    db.weeklyReview.count({ where: { userId, updatedAt: { gte: start, lt: end } } }),
  ]);

  return earnedFoodFrom({ habitsCompleted, journalEntries, habitJournals, weeklyReviews });
}

/**
 * List every pet for a user (alive first by creation order, then the graveyard),
 * advancing each to `now` and permanently recording any death discovered.
 */
export async function listPets(userId: string, now: number, db: DbClient = defaultDb): Promise<Pet[]> {
  log.debug("Listing pets", { event: "repo.pets.list", userId: redactUserId(userId) });
  validateDatabaseUrl();

  const rows = (await db.pet.findMany({
    where: { userId },
    orderBy: [{ isAlive: "desc" }, { createdAt: "asc" }],
  })) as PetRow[];

  const pets: Pet[] = [];
  for (const row of rows) {
    const resolved = await persistDeathIfNeeded(row, now, db);
    pets.push(toPet(resolved));
  }
  return pets;
}

/** The outcome of attempting to adopt a pet. */
export type AdoptResult =
  | { ok: true; pet: Pet }
  | { ok: false; reason: "cap" | "monthly" };

/**
 * Adopt a new pet. Enforces two rules and seeds a unique creature from a fresh
 * random genome:
 *   1. Ecosystem cap — at most MAX_ALIVE_PETS alive at once.
 *   2. Monthly adoption limit — only one *living* pet may be born per calendar
 *      month, so adopting is a considered commitment. Releasing a pet (or its
 *      passing) frees that month's slot immediately, letting the user adopt a
 *      fresh companion straight away — we only count pets that are still alive.
 *
 * Returns a discriminated result instead of throwing so the specific reason
 * survives the trip to the browser: Next.js strips thrown error *messages* from
 * server actions in production (replacing them with a generic digest), which
 * would otherwise hide why an adoption was refused.
 */
export async function adoptPet(userId: string, input: PetAdoptInput, now: number, db: DbClient = defaultDb): Promise<AdoptResult> {
  log.info("Adopting pet", { event: "repo.pets.adopt", userId: redactUserId(userId), temperament: input.temperament });
  validateDatabaseUrl();
  const data = petAdoptSchema.parse(input);

  const aliveCount = await db.pet.count({ where: { userId, isAlive: true } });
  if (aliveCount >= MAX_ALIVE_PETS) {
    return { ok: false, reason: "cap" };
  }

  // Monthly limit: block only if a still-living pet was born within the current
  // calendar month. Released or departed pets do not hold the slot, so deleting a
  // pet lets the user adopt again immediately (and a death is a fresh start, not a
  // month-long lockout).
  const nowDate = new Date(now);
  const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
  const monthEnd = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 1);
  const bornThisMonth = await db.pet.count({
    where: { userId, isAlive: true, bornAt: { gte: monthStart, lt: monthEnd } },
  });
  if (bornThisMonth > 0) {
    return { ok: false, reason: "monthly" };
  }

  const vitals = initialVitals(now);
  const record = (await db.pet.create({
    data: {
      userId,
      name: data.name,
      temperament: data.temperament,
      seed: randomSeed(),
      totalFeeds: 0,
      satiety: vitals.satiety,
      health: vitals.health,
      bornAt: new Date(now),
      lastFedAt: new Date(now),
      lastSimAt: new Date(now),
      isAlive: true,
    },
  })) as PetRow;

  return { ok: true, pet: toPet(record) };
}

/** The outcome of attempting to feed a pet. */
export type FeedResult =
  | { ok: true; pet: Pet; fedAmount: number; evolved: boolean }
  | { ok: false; reason: "not_found" | "dead" | "no_food" | "full"; pet?: Pet };

/**
 * Feed a pet by up to `amount` units, drawing from the shared daily food pool.
 * The actual amount is clamped by both the food available today and the pet's
 * remaining satiety capacity, so a feed never wastes food or overfills.
 */
export async function feedPet(
  userId: string,
  petId: string,
  amount: number,
  dateKey: string,
  now: number,
  db: DbClient = defaultDb,
): Promise<FeedResult> {
  log.info("Feeding pet", { event: "repo.pets.feed", userId: redactUserId(userId), petId, amount });
  validateDatabaseUrl();

  const row = (await db.pet.findFirst({ where: { id: petId, userId } })) as PetRow | null;
  if (!row) {
    return { ok: false, reason: "not_found" };
  }

  // Make sure the pet has not died before we let it eat.
  const resolved = await persistDeathIfNeeded(row, now, db);
  if (!resolved.isAlive) {
    return { ok: false, reason: "dead", pet: toPet(resolved) };
  }

  const vitals = simulatePet(vitalsFromRow(resolved), tuningFor(resolved.temperament), now);

  const used = await countFeedsUsedToday(userId, dateKey, db);
  const earned = await countEarnedFoodToday(userId, dateKey, now, db);
  const available = Math.max(0, earned - used);
  const capacity = satietyCapacity(vitals.satiety);
  const effective = Math.min(amount, available, capacity);

  if (effective <= 0) {
    return { ok: false, reason: available <= 0 ? "no_food" : "full", pet: toPet(resolved) };
  }

  const fedVitals = feedVitals(vitals, effective, now);
  const totalFeeds = resolved.totalFeeds + effective;
  const evolved = didEvolve(resolved.totalFeeds, totalFeeds);

  const updated = (await db.pet.update({
    where: { id: petId },
    data: {
      satiety: fedVitals.satiety,
      health: fedVitals.health,
      lastFedAt: new Date(now),
      lastSimAt: new Date(now),
      totalFeeds,
    },
  })) as PetRow;

  await db.petFeedLog.create({ data: { userId, petId, dateKey, amount: effective } });

  return { ok: true, pet: toPet(updated), fedAmount: effective, evolved };
}

/**
 * Lay a pet to rest, removing it (and its feed logs, via cascade) from the
 * ecosystem. Only a pet that has actually died may be buried — the living stay.
 */
export async function buryPet(userId: string, petId: string, now: number, db: DbClient = defaultDb): Promise<boolean> {
  log.info("Burying pet", { event: "repo.pets.bury", userId: redactUserId(userId), petId });
  validateDatabaseUrl();

  const row = (await db.pet.findFirst({ where: { id: petId, userId } })) as PetRow | null;
  if (!row) {
    return false;
  }

  const resolved = await persistDeathIfNeeded(row, now, db);
  if (resolved.isAlive) {
    throw new Error("You can only lay a pet to rest after it has passed.");
  }

  await db.pet.delete({ where: { id: petId } });
  return true;
}

/**
 * Release a pet from the ecosystem, alive or dead. Unlike `buryPet` (which is
 * reserved for pets that have already passed), this is a deliberate user action
 * to let go of any pet — for example to make room under the alive cap or to free
 * up the current month's adoption slot. The cascade also removes its feed logs.
 */
export async function deletePet(userId: string, petId: string, db: DbClient = defaultDb): Promise<boolean> {
  log.info("Releasing pet", { event: "repo.pets.delete", userId: redactUserId(userId), petId });
  validateDatabaseUrl();

  const row = (await db.pet.findFirst({ where: { id: petId, userId } })) as PetRow | null;
  if (!row) {
    return false;
  }

  await db.pet.delete({ where: { id: petId } });
  return true;
}
