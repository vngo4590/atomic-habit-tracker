import "server-only";

/**
 * Stack-link validator — checks a single `habit.stackNextId` change before the
 * habits repository writes it. It lives in the habits feature (not stacks) so
 * the dependency only points one way: the stacks repository uses habits, and
 * habits only uses the pure stack error helpers from `@/features/stacks`.
 */

import { makeStackError } from "@/features/stacks";
import { db as defaultDb } from "@/lib/db/client";
import { logger, redactUserId } from "@/lib/logger";

type DbClient = typeof defaultDb;

// Keep the original module name so existing log queries and dashboards still match.
const log = logger.child({ module: "repo.habits" });

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
  log.debug("Validating stack link", {
    event: "repo.habit.stackLink.validate",
    userId: redactUserId(userId),
    habitId,
    nextId,
  });
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
