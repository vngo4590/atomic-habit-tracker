"use client";

/**
 * Client-side logger for Atomicly.
 *
 * This logger is intended for development diagnostics only. In production
 * builds, all output is suppressed to avoid leaking information in user
 * browsers. If production client telemetry is needed, route events through
 * a dedicated API endpoint instead.
 *
 * Follows the same redaction rules as the server logger to prevent
 * accidental exposure of sensitive data during development.
 */

import { redactEmail, redactObject, redactUserId } from "./logger-redact";

export { redactEmail, redactUserId };

/** Whether client logging is active (dev only). */
const IS_ACTIVE = process.env.NODE_ENV !== "production";

const PREFIX = "[Atomicly]";

type LogContext = Record<string, unknown>;

/**
 * Client logger — outputs to browser console in development only.
 *
 * Usage:
 * ```ts
 * import { clientLogger } from "@/lib/logger-client";
 * clientLogger.info("Habit toggled", { habitId: "abc123", done: true });
 * ```
 */
export const clientLogger = {
  /** Info level — significant UI events (navigation, action calls). */
  info(message: string, context?: LogContext): void {
    if (!IS_ACTIVE) return;
    const safe = context ? redactObject(context) : undefined;
    if (safe) {
      console.info(`${PREFIX} ${message}`, safe);
    } else {
      console.info(`${PREFIX} ${message}`);
    }
  },

  /** Warn level — recoverable issues (failed action retry, stale data). */
  warn(message: string, context?: LogContext): void {
    if (!IS_ACTIVE) return;
    const safe = context ? redactObject(context) : undefined;
    if (safe) {
      console.warn(`${PREFIX} ${message}`, safe);
    } else {
      console.warn(`${PREFIX} ${message}`);
    }
  },

  /** Error level — unexpected client-side failures. */
  error(message: string, context?: LogContext & { error?: unknown }): void {
    if (!IS_ACTIVE) return;
    const { error, ...rest } = context ?? {};
    const safe = redactObject(rest);
    if (error instanceof Error) {
      console.error(`${PREFIX} ${message}`, { ...safe as object, error: error.message });
    } else if (safe) {
      console.error(`${PREFIX} ${message}`, safe);
    } else {
      console.error(`${PREFIX} ${message}`);
    }
  },
};
