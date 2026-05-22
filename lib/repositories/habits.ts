import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import {
  checkInSchema,
  contractSchema,
  habitCreateSchema,
  habitUpdateSchema,
  noteSchema,
  stackMutationSchema,
  type CheckInInput,
  type HabitCreateInput,
  type HabitUpdateInput,
  type StackMutationInput,
} from "@/lib/contracts/domain";
import { makeStackError } from "@/lib/stack-errors";
import { stackInsertPatches, stackRemovePatches, stackReorderPatches, getStackChain, getStackRoot } from "@/lib/stack";
import type { CheckIn, Habit, Note } from "@/lib/types";

type DbClient = typeof defaultDb;
type HabitRecord = {
  id: string;
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
  checkIns?: Array<{
    dateKey: string;
    done: boolean;
    mood: number | null;
    journal: string | null;
  }>;
  notes?: Array<{ id: string; body: string; createdAt: Date }>;
  contract?: { terms: string; partners: string[] } | null;
};

const habitInclude = {
  checkIns: true,
  notes: { orderBy: { createdAt: "desc" as const } },
  contract: true,
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toHabit(record: HabitRecord & { stackNextId?: string | null }): Habit {
  const checkIns = record.checkIns ?? [];
  const notes = record.notes ?? [];
  const contract = record.contract;
  const history: Habit["history"] = {};

  for (const checkIn of checkIns) {
    history[checkIn.dateKey] = {
      done: checkIn.done,
      ...(checkIn.mood ? { mood: checkIn.mood } : {}),
      ...(checkIn.journal ? { journal: checkIn.journal } : {}),
    };
  }

  return {
    id: record.id,
    name: record.name,
    emoji: record.emoji,
    cue: record.cue,
    craving: record.craving,
    response: record.response,
    reward: record.reward,
    loopCue: record.loopCue,
    loopCraving: record.loopCraving,
    loopResponse: record.loopResponse,
    loopReward: record.loopReward,
    twoMin: record.twoMin,
    identity: record.identity,
    environment: record.environment,
    schedule: record.schedule,
    time: record.time,
    stackNextId: record.stackNextId ?? null,
    contract: contract?.terms ?? "",
    contractPartners: contract?.partners ?? [],
    history,
    notes: notes.map((note) => ({
      id: note.id,
      body: note.body,
      createdAt: toDateKey(note.createdAt),
    })),
    createdAt: toDateKey(record.createdAt),
  };
}

export async function listHabits(userId: string, db: DbClient = defaultDb) {
  validateDatabaseUrl();

  const records = await db.habit.findMany({
    where: { userId, archivedAt: null },
    include: habitInclude,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return records.map(toHabit);
}

export async function getHabit(userId: string, habitId: string, db: DbClient = defaultDb) {
  validateDatabaseUrl();

  const record = await db.habit.findFirst({
    where: { id: habitId, userId, archivedAt: null },
    include: habitInclude,
  });

  return record ? toHabit(record) : null;
}

export async function createHabit(userId: string, input: HabitCreateInput, db: DbClient = defaultDb) {
  validateDatabaseUrl();
  const data = habitCreateSchema.parse(input);

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

  return toHabit(record);
}

export async function updateHabit(userId: string, habitId: string, input: HabitUpdateInput, db: DbClient = defaultDb) {
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

export async function upsertCheckIn(userId: string, habitId: string, input: CheckInInput, db: DbClient = defaultDb) {
  validateDatabaseUrl();
  const data = checkInSchema.parse(input);
  const habit = await getHabit(userId, habitId, db);

  if (!habit) {
    return null;
  }

  if (!data.done && !data.mood && !data.journal) {
    await db.habitCheckIn.deleteMany({ where: { userId, habitId, dateKey: data.dateKey } });
    return getHabit(userId, habitId, db);
  }

  await db.habitCheckIn.upsert({
    where: { habitId_dateKey: { habitId, dateKey: data.dateKey } },
    create: {
      userId,
      habitId,
      dateKey: data.dateKey,
      done: data.done,
      mood: data.mood ?? null,
      journal: data.journal ?? null,
    },
    update: {
      done: data.done,
      mood: data.mood ?? null,
      journal: data.journal ?? null,
    },
  });

  return getHabit(userId, habitId, db);
}

export async function replaceNotes(userId: string, habitId: string, notes: Note[], db: DbClient = defaultDb) {
  return updateHabit(userId, habitId, { notes }, db);
}

export async function addNote(userId: string, habitId: string, body: string, db: DbClient = defaultDb) {
  validateDatabaseUrl();
  const data = noteSchema.parse({ body });
  const habit = await getHabit(userId, habitId, db);

  if (!habit) {
    return null;
  }

  await db.habitNote.create({ data: { userId, habitId, body: data.body } });
  return getHabit(userId, habitId, db);
}

export async function saveContract(
  userId: string,
  habitId: string,
  input: { terms: string; partners: string[] },
  db: DbClient = defaultDb,
) {
  const data = contractSchema.parse(input);
  return updateHabit(userId, habitId, { contract: data.terms, contractPartners: data.partners }, db);
}

/**
 * Validate a `habit.stackNextId = nextId` change before it is written.
 *
 * Rules (mirroring `openspec/changes/enhanced-habit-stacking/specs/habit-stack-model/spec.md`):
 *   - A habit cannot point to itself (self-reference).
 *   - The target habit must exist and belong to the same user.
 *   - The target must not already be the `stackNextId` of any other habit
 *     (exclusivity: at most one predecessor).
 *   - Setting the link must not introduce a cycle.
 *
 * Throws `StackError` on any violation so server actions and API routes can
 * surface a user-friendly message.
 */
export async function validateStackLink(
  userId: string,
  habitId: string,
  nextId: string | null,
  db: DbClient = defaultDb,
) {
  if (nextId === null) return;

  if (nextId === habitId) {
    throw makeStackError("self_reference");
  }

  const target = await db.habit.findFirst({
    where: { id: nextId, userId, archivedAt: null },
    select: { id: true, stackNextId: true },
  });
  if (!target) {
    throw makeStackError("target_not_found");
  }

  const currentOwner = await db.habit.findFirst({
    where: { userId, stackNextId: nextId, NOT: { id: habitId } },
    select: { id: true },
  });
  if (currentOwner) {
    throw makeStackError("target_in_other_stack");
  }

  // Cycle detection: walk forward from `nextId` and see if we reach `habitId`.
  let cursor: string | null = target.stackNextId;
  const visited = new Set<string>([nextId]);
  while (cursor) {
    if (visited.has(cursor)) break;
    visited.add(cursor);
    if (cursor === habitId) {
      throw makeStackError("circular_stack");
    }
    const next: { stackNextId: string | null } | null = await db.habit.findUnique({
      where: { id: cursor },
      select: { stackNextId: true },
    });
    cursor = next?.stackNextId ?? null;
  }
}

/**
 * Atomically apply a stack mutation (insert or remove) inside a single
 * database transaction. This is the only safe path for multi-habit stack
 * mutations because it:
 *   1. Loads the current habit graph for the user.
 *   2. Validates the final graph (self-reference, exclusivity, cycle).
 *   3. Applies the generated patches in safe order so the
 *      `stackNextId @unique` constraint is never violated mid-transaction.
 *   4. Rolls back the whole change on any failure.
 *
 * Returns the affected habits in their post-mutation state.
 */
export async function applyStackMutation(
  userId: string,
  input: StackMutationInput,
  db: DbClient = defaultDb,
): Promise<Habit[]> {
  validateDatabaseUrl();
  const mutation = stackMutationSchema.parse(input);

  return db.$transaction(async (tx) => {
    // Load *all* user habits (including archived) so reorder validation can
    // see archived predecessors that might still reference active habits in
    // the chain. The active subset is used for insert/remove projections;
    // archived habits don't participate in those flows but are kept for
    // cycle/constraint awareness.
    const records = await tx.habit.findMany({
      where: { userId, archivedAt: null },
      include: habitInclude,
    });
    const habits = records.map(toHabit);

    if (mutation.kind === "insert") {
      const habit = habits.find((h) => h.id === mutation.habitId);
      if (!habit) {
        throw makeStackError("habit_not_found");
      }
      if (mutation.habitId === mutation.targetId) {
        throw makeStackError("self_reference");
      }
      const target = habits.find((h) => h.id === mutation.targetId);
      if (!target) {
        throw makeStackError("target_not_found");
      }

      // The current habit must be solo before insertion. The UI only offers
      // solo habits as targets too, but this is enforced server-side.
      if (habit.stackNextId) {
        throw makeStackError("source_in_other_stack");
      }
      const habitHasPredecessor = habits.some(
        (h) => h.id !== habit.id && h.stackNextId === habit.id,
      );
      if (habitHasPredecessor) {
        throw makeStackError("source_in_other_stack");
      }

      // Project the post-mutation graph and validate it has no cycles.
      const projected = habits.map((h) => ({ ...h }));
      const projectedMap = new Map(projected.map((h) => [h.id, h]));
      const patches = stackInsertPatches(mutation.habitId, mutation.position, mutation.targetId, projected);
      for (const { id, patch } of patches) {
        const record = projectedMap.get(id);
        if (!record) continue;
        Object.assign(record, patch);
      }
      assertNoCycles(projected);

      // Apply patches in order; the order from stackInsertPatches keeps the
      // unique constraint intact at every intermediate step.
      for (const { id, patch } of patches) {
        await tx.habit.update({
          where: { id },
          data: { stackNextId: patch.stackNextId ?? null },
        });
      }
      const affectedIds = Array.from(new Set(patches.map((p) => p.id)));
      const updated = await tx.habit.findMany({
        where: { userId, id: { in: affectedIds } },
        include: habitInclude,
      });
      return updated.map(toHabit);
    }

    if (mutation.kind === "remove") {
      const habit = habits.find((h) => h.id === mutation.habitId);
      if (!habit) {
        throw makeStackError("habit_not_found");
      }
      const patches = stackRemovePatches(mutation.habitId, habits);
      for (const { id, patch } of patches) {
        await tx.habit.update({
          where: { id },
          data: { stackNextId: patch.stackNextId ?? null },
        });
      }
      const affectedIds = Array.from(new Set(patches.map((p) => p.id)));
      if (affectedIds.length === 0) {
        return [];
      }
      const updated = await tx.habit.findMany({
        where: { userId, id: { in: affectedIds } },
        include: habitInclude,
      });
      return updated.map(toHabit);
    }

    // kind === "reorder"
    const { habitIds } = mutation;

    // Reject duplicate ids in the input.
    if (new Set(habitIds).size !== habitIds.length) {
      throw makeStackError("invalid_reorder");
    }

    // All ids must reference existing non-archived habits for this user.
    const byId = new Map(habits.map((h) => [h.id, h]));
    const resolved = habitIds.map((id) => byId.get(id));
    if (resolved.some((h) => !h)) {
      throw makeStackError("invalid_reorder");
    }

    // The supplied ids (as a set) must equal the current chain rooted at any
    // of them. This prevents merging two chains, adding solos, or dropping
    // members through a reorder mutation.
    const anchor = resolved[0]!;
    const root = getStackRoot(anchor, habits);
    const currentChain = getStackChain(root, habits);
    const currentIds = new Set(currentChain.map((h) => h.id));
    if (currentIds.size !== habitIds.length) {
      throw makeStackError("invalid_reorder");
    }
    for (const id of habitIds) {
      if (!currentIds.has(id)) {
        throw makeStackError("invalid_reorder");
      }
    }

    // Project and assert no cycles in the post-state. A valid permutation
    // of a closed chain cannot create a cycle, but we re-check defensively.
    const projected = habits.map((h) => ({ ...h }));
    const projectedMap = new Map(projected.map((h) => [h.id, h]));
    const patches = stackReorderPatches(habitIds);
    for (const { id, patch } of patches) {
      const record = projectedMap.get(id);
      if (!record) continue;
      Object.assign(record, patch);
    }
    assertNoCycles(projected);

    for (const { id, patch } of patches) {
      await tx.habit.update({
        where: { id },
        data: { stackNextId: patch.stackNextId ?? null },
      });
    }
    const affectedIds = Array.from(new Set(patches.map((p) => p.id)));
    const updated = await tx.habit.findMany({
      where: { userId, id: { in: affectedIds } },
      include: habitInclude,
    });
    return updated.map(toHabit);
  });
}

function assertNoCycles(habits: Habit[]) {
  const map = new Map(habits.map((h) => [h.id, h]));
  for (const start of habits) {
    const seen = new Set<string>();
    let cursor: string | null = start.id;
    while (cursor) {
      if (seen.has(cursor)) {
        throw makeStackError("circular_stack");
      }
      seen.add(cursor);
      cursor = map.get(cursor)?.stackNextId ?? null;
    }
  }
}

export type { CheckIn };
