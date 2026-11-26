import "server-only";

/**
 * Settings feature — server-only public API.
 *
 * Database access for user preferences. Server code only; guarded by
 * `server-only`.
 */

export * from "./server/preferences.repository";
