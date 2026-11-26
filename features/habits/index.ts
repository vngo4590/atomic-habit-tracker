/**
 * Habits feature — client-safe public API.
 *
 * Everything exported here is safe to use in the browser and on the server:
 * pure habit rules (schedules, streak maths, the active-habit cap, sentence
 * helpers). Database code lives behind `@/features/habits/server` and server
 * actions behind `@/features/habits/actions`, so they are deliberately NOT
 * exported from this file.
 */

export * from "./model/habit-cap";
export * from "./model/habit-sentence";
export * from "./model/metrics";
export * from "./model/schedule";
