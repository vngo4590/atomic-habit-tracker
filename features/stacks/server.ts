import "server-only";

/**
 * Stacks feature — server-only public API.
 *
 * Database access for habit stacks (validating and applying `stackNextId`
 * link changes). Server code only; guarded by `server-only`.
 */

export * from "./server/stacks.repository";
