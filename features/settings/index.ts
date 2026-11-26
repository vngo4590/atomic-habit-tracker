/**
 * Settings feature — client-safe public API.
 *
 * The preferences and backup validation schemas plus the pure backup
 * builder (`buildBackup`). Database code lives behind
 * `@/features/settings/server` and server actions behind
 * `@/features/settings/actions`.
 */

export * from "./contracts";
export * from "./model/backup-export";
