import "server-only";

/**
 * Stacks repository — the only place that writes habit-stack links
 * (`stackNextId`) in bulk. It applies multi-habit insert / remove / reorder
 * changes inside one transaction, so a stack can never end up half-updated,
 * circular, or with a habit belonging to two stacks. Single link changes made
 * through `updateHabit` are validated by `validateStackLink` in the habits
 * feature, which keeps the habits -> stacks dependency one-way.
 */

import { habitInclude, toHabit } from "@/features/habits/server";
import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import { logger, redactUserId } from "@/lib/logger";
import type { Habit } from "@/lib/types";

import { stackMutationSchema, type StackMutationInput } from "../contracts";
import { getStackChain, getStackRoot, stackInsertPatches, stackRemovePatches, stackReorderPatches } from "../model/stack";
import { makeStackError } from "../model/stack-errors";

type DbClient = typeof defaultDb;

// Keep the original module name so existing log queries and dashboards still match.
const log = logger.child({ module: "repo.habits" });

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
  log.debug("Applying stack mutation", {
    event: "repo.habit.stackMutation.apply",
    userId: redactUserId(userId),
    kind: input.kind,
    habitId: "habitId" in input ? input.habitId : undefined,
    targetId: "targetId" in input ? input.targetId : undefined,
    habitCount: "habitIds" in input ? input.habitIds.length : undefined,
  });
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
