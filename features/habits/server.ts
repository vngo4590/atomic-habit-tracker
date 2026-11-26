import "server-only";

/**
 * Habits feature — server-only public API.
 *
 * Database access for habits, check-ins, notes/contracts and formation
 * verdicts. Only server code (route handlers, layouts, server actions and
 * other features' repositories) may import this; the `server-only` guard
 * fails the build if it ever leaks into a browser bundle.
 */

export * from "./server/check-ins.repository";
export { habitInclude, toHabit, type HabitRecord } from "./server/habit-mapper";
export * from "./server/habits.repository";
export * from "./server/notes-contract.repository";
export * from "./server/verdicts.repository";
