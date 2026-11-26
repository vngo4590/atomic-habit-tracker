"use server";

/**
 * Stack server action: lets the browser link, unlink or reorder habits in a
 * habit stack ("after I do X, I will do Y") as one atomic database change.
 */

import { requireUserId } from "@/lib/auth/session";
import { logger, redactUserId } from "@/lib/logger";
import { revalidateApp } from "@/lib/revalidate-app";

import type { StackMutationInput } from "./contracts";
import { applyStackMutation } from "./server";

const log = logger.child({ module: "actions.domain" });

/**
 * Apply an atomic stack mutation (insert or remove). All affected habits are
 * updated inside a single database transaction; cycles and multi-stack
 * membership are rejected with a `StackError` whose message is safe to show
 * directly in a UI dialog.
 */
export async function applyStackMutationAction(input: StackMutationInput) {
  const userId = await requireUserId();
  log.info("Applying stack mutation", { event: "habit.stack_mutated", userId: redactUserId(userId), kind: input.kind });
  const affected = await applyStackMutation(userId, input);

  revalidateApp();
  return affected;
}
