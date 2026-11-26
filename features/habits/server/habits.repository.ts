import "server-only";

/**
 * Habits repository — reads and writes the habits themselves: list, fetch,
 * count against the active-habit cap, create, update and archive. Every query
 * is scoped to the signed-in user's id so one user can never see or change
 * another user's habits.
 */

import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import { logger, redactUserId } from "@/lib/logger";
import type { Habit } from "@/lib/types";

import { habitCreateSchema, habitUpdateSchema, type HabitCreateInput, type HabitUpdateInput } from "../contracts";
import { MAX_ACTIVE_HABITS } from "../model/habit-cap";
import { habitInclude, toHabit } from "./habit-mapper";
import { validateStackLink } from "./stack-link.validator";

type DbClient = typeof defaultDb;

const log = logger.child({ module: "repo.habits" });

export async function listHabits(userId: string, db: DbClient = defaultDb) {
  log.debug("Listing habits", { event: "repo.habit.list", userId: redactUserId(userId) });
  validateDatabaseUrl();

  const records = await db.habit.findMany({
    where: { userId, archivedAt: null },
    include: habitInclude,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return records.map(toHabit);
}

export async function getHabit(userId: string, habitId: string, db: DbClient = defaultDb) {
  log.debug("Getting habit", { event: "repo.habit.get", userId: redactUserId(userId), habitId });
  validateDatabaseUrl();

  const record = await db.habit.findFirst({
    where: { id: habitId, userId, archivedAt: null },
    include: habitInclude,
  });

  return record ? toHabit(record) : null;
}

/**
 * Count a user's *active* habits — the ones that count against the
 * `MAX_ACTIVE_HABITS` cap. A habit is active when it is BOTH:
 *   1. not archived (`archivedAt: null`), and
 *   2. not inducted into the Hall of Fame — i.e. it has no `FormationVerdict`
 *      whose `decision` is `formed` (`verdicts: { none: { decision: "formed" } }`).
 *
 * This is the authoritative, server-side mirror of the pure `activeHabitCount`
 * helper the client uses, so the two can never disagree about who is at the cap.
 */
export async function countActiveHabits(userId: string, db: DbClient = defaultDb): Promise<number> {
  validateDatabaseUrl();
  return db.habit.count({
    where: {
      userId,
      archivedAt: null,
      verdicts: { none: { decision: "formed" } },
    },
  });
}

/**
 * The outcome of attempting to create a habit. Mirrors the Pet ecosystem's
 * `AdoptResult`: we return a discriminated union instead of throwing so the
 * specific refusal reason survives the trip to the browser. Next.js strips
 * thrown error *messages* from server actions in production (replacing them with
 * a generic digest), which would otherwise hide *why* a create was refused.
 */
export type CreateHabitResult =
  | { ok: true; habit: Habit }
  | { ok: false; reason: "cap" };

export async function createHabit(
  userId: string,
  input: HabitCreateInput,
  db: DbClient = defaultDb,
): Promise<CreateHabitResult> {
  log.debug("Creating habit", {
    event: "repo.habit.create",
    userId: redactUserId(userId),
    hasContract: Boolean(input.contract || input.contractPartners.length),
    stackNextId: input.stackNextId ?? null,
  });
  validateDatabaseUrl();
  const data = habitCreateSchema.parse(input);

  // Enforce the active-habit cap BEFORE writing anything, so a refused create
  // performs no database mutation. Inducted and archived habits are excluded by
  // `countActiveHabits`, so they never block a new create.
  const activeCount = await countActiveHabits(userId, db);
  if (activeCount >= MAX_ACTIVE_HABITS) {
    log.info("Habit create refused: active cap reached", {
      event: "repo.habit.create.capped",
      userId: redactUserId(userId),
      activeCount,
      cap: MAX_ACTIVE_HABITS,
    });
    return { ok: false, reason: "cap" };
  }

  const record = await db.habit.create({
    data: {
      userId,
      name: data.name,
      emoji: data.emoji,
      cue: data.cue,
      craving: data.craving,
      response: data.response,
      reward: data.reward,
      loopCue: data.loopCue,
      loopCraving: data.loopCraving,
      loopResponse: data.loopResponse,
      loopReward: data.loopReward,
      twoMin: data.twoMin,
      identity: data.identity,
      environment: data.environment,
      schedule: data.schedule,
      time: data.time,
      stackNextId: data.stackNextId ?? null,
      contract: data.contract || data.contractPartners.length
        ? { create: { userId, terms: data.contract, partners: data.contractPartners } }
        : undefined,
    },
    include: habitInclude,
  });

  return { ok: true, habit: toHabit(record) };
}

export async function updateHabit(userId: string, habitId: string, input: HabitUpdateInput, db: DbClient = defaultDb) {
  log.debug("Updating habit", {
    event: "repo.habit.update",
    userId: redactUserId(userId),
    habitId,
    updatesContract: input.contract !== undefined || input.contractPartners !== undefined,
    updatesNotes: input.notes !== undefined,
    updatesStackLink: input.stackNextId !== undefined,
  });
  validateDatabaseUrl();
  const current = await getHabit(userId, habitId, db);

  if (!current) {
    return null;
  }

  const data = habitUpdateSchema.parse(input);
  const { contract, contractPartners, notes, ...habitPatch } = data;

  if (habitPatch.stackNextId !== undefined) {
    await validateStackLink(userId, habitId, habitPatch.stackNextId ?? null, db);
  }

  const updateData: Record<string, unknown> = { ...habitPatch };
  if (habitPatch.stackNextId !== undefined) {
    updateData.stackNextId = habitPatch.stackNextId ?? null;
  }

  await db.habit.update({
    where: { id: habitId },
    data: updateData,
  });

  if (contract !== undefined || contractPartners !== undefined) {
    await db.habitContract.upsert({
      where: { habitId },
      create: {
        userId,
        habitId,
        terms: contract ?? "",
        partners: contractPartners ?? [],
      },
      update: {
        terms: contract ?? current.contract,
        partners: contractPartners ?? current.contractPartners,
      },
    });
  }

  if (notes) {
    await db.habitNote.deleteMany({ where: { userId, habitId } });
    if (notes.length) {
      await db.habitNote.createMany({
        data: notes.map((note) => ({
          userId,
          habitId,
          body: note.body,
          createdAt: new Date(`${note.createdAt}T00:00:00.000Z`),
        })),
      });
    }
  }

  return getHabit(userId, habitId, db);
}

export async function archiveHabit(userId: string, habitId: string, db: DbClient = defaultDb) {
  log.debug("Archiving habit", { event: "repo.habit.archive", userId: redactUserId(userId), habitId });
  validateDatabaseUrl();
  const current = await getHabit(userId, habitId, db);

  if (!current) {
    return null;
  }

  await db.habit.update({
    where: { id: habitId },
    data: { archivedAt: new Date() },
  });

  return current;
}
