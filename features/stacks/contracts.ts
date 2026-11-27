/**
 * Stacks feature — input validation (Zod schemas).
 *
 * Describes the three stack changes a user can ask for (insert a habit before
 * or after another, remove a habit from its stack, reorder a whole stack) so
 * the browser, server actions and repositories all agree on the same shape.
 */

import { z } from "zod";

import type { StackMutationInput } from "@/lib/types";

export type { StackMutationInput };

export const stackMutationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("insert"),
    habitId: z.string().min(1),
    position: z.enum(["before", "after"]),
    targetId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("remove"),
    habitId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("reorder"),
    habitIds: z.array(z.string().min(1)).min(2),
  }),
]) satisfies z.ZodType<StackMutationInput>;
