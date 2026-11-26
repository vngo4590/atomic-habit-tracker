/**
 * Stacks feature — client-safe public API.
 *
 * Pure stack helpers, the friendly `StackError` messages and the stack
 * mutation schema. Safe for browser and server. Database code is behind
 * `@/features/stacks/server`; the server action is behind
 * `@/features/stacks/actions`.
 */

export * from "./contracts";
export * from "./model/stack";
export * from "./model/stack-errors";
