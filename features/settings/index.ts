/**
 * Settings feature — client-safe public API.
 *
 * The pure backup builder (`buildBackup`). Zod schemas live behind
 * `@/features/settings/contracts` so client bundles never pull in Zod.
 * Database code lives behind
 * `@/features/settings/server` and server actions behind
 * `@/features/settings/actions`.
 */

export * from "./model/backup-export";
