/**
 * Structured server-side logger for Atomicly.
 *
 * Outputs JSON in production (captured by Azure App Service stdout) and
 * human-readable format in development. Supports log levels controlled via
 * the LOG_LEVEL environment variable (default: "info" in prod, "debug" in dev).
 *
 * Design principles:
 * - Allowlist-first: callers explicitly pass only safe context fields.
 * - Redaction fallback: the redactObject utility catches stray sensitive data.
 * - Correlation: pass `requestId` in context to tie related log entries together.
 * - No external dependencies: thin wrapper around console methods.
 */

import { redactEmail, redactObject, redactUserId } from "./logger-redact";

// Re-export redaction helpers for convenience
export { redactEmail, redactUserId, redactObject };

/** Supported log levels in ascending severity order. */
export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Structured context attached to each log entry. */
export interface LogContext {
  module?: string;
  event?: string;
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

/** A single structured log entry as written to stdout. */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  event: string;
  message: string;
  [key: string]: unknown;
}

/**
 * Determine the active log level from environment.
 * Default: "debug" in development, "info" in production.
 */
function resolveLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in LEVEL_ORDER) return envLevel as LogLevel;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

/** Whether the runtime is production (use JSON format). */
function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Serialize an error into a safe loggable object.
 * Stack traces are only included in non-production environments.
 */
function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const serialized: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };
    // Include error code if present (e.g., Prisma errors)
    if ("code" in error) serialized.code = (error as { code: unknown }).code;
    if ("digest" in error) serialized.digest = (error as { digest: unknown }).digest;
    // Stack only in non-prod for debugging
    if (!isProduction() && error.stack) {
      serialized.stack = error.stack;
    }
    return serialized;
  }
  return { raw: String(error) };
}

/**
 * Logger class providing structured, level-filtered logging.
 *
 * Usage:
 * ```ts
 * import { logger } from "@/lib/logger";
 * const log = logger.child({ module: "actions.auth" });
 * log.info("User logged in", { event: "auth.login", userId: redactUserId(id) });
 * ```
 */
class Logger {
  private readonly minLevel: LogLevel;
  private readonly defaultContext: LogContext;

  constructor(context: LogContext = {}) {
    this.minLevel = resolveLevel();
    this.defaultContext = context;
  }

  /**
   * Create a child logger with additional default context.
   * Useful for scoping logs to a specific module or request.
   */
  child(context: LogContext): Logger {
    const child = new Logger({ ...this.defaultContext, ...context });
    return child;
  }

  /** Log at debug level — for diagnostic/dev information. */
  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  /** Log at info level — for significant business events. */
  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  /** Log at warn level — for expected-but-notable failures. */
  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  /** Log at error level — for unexpected failures only. */
  error(message: string, context?: LogContext & { error?: unknown }): void {
    const { error, ...rest } = context ?? {};
    const enriched: LogContext = { ...rest };
    if (error) {
      enriched.error = serializeError(error);
    }
    this.log("error", message, enriched);
  }

  /** Internal: emit a log entry if the level passes the filter. */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return;

    const merged = { ...this.defaultContext, ...context };
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: merged.module ?? "app",
      event: merged.event ?? "",
      message,
      ...this.sanitizeContext(merged),
    };

    if (isProduction()) {
      // JSON format for structured log ingestion
      const output = JSON.stringify(entry);
      this.emit(level, output);
    } else {
      // Human-readable format for local development
      const prefix = `[${entry.timestamp.slice(11, 23)}] ${level.toUpperCase().padEnd(5)}`;
      const mod = merged.module ? `[${merged.module}]` : "";
      const evt = merged.event ? `(${merged.event})` : "";
      const extra = this.formatExtra(merged);
      this.emit(level, `${prefix} ${mod} ${message} ${evt}${extra}`);
    }
  }

  /** Remove keys that are represented in the top-level LogEntry structure. */
  private sanitizeContext(context: LogContext): Record<string, unknown> {
    const { module: moduleName, event: eventName, requestId, userId, ...rest } = context;
    void moduleName;
    void eventName;
    const safe: Record<string, unknown> = {};
    if (requestId) safe.requestId = requestId;
    if (userId) safe.userId = redactUserId(userId);
    // Apply redactObject to any remaining context as safety net
    const redacted = redactObject(rest) as Record<string, unknown>;
    return { ...safe, ...redacted };
  }

  /** Format extra context for dev-mode readable output. */
  private formatExtra(context: LogContext): string {
    const { module: moduleName, event: eventName, ...rest } = context;
    void moduleName;
    void eventName;
    const keys = Object.keys(rest);
    if (keys.length === 0) return "";
    const safe = redactObject(rest) as Record<string, unknown>;
    return ` ${JSON.stringify(safe)}`;
  }

  /** Emit to the appropriate console method. */
  private emit(level: LogLevel, output: string): void {
    switch (level) {
      case "debug":
        console.debug(output);
        break;
      case "info":
        console.info(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
        console.error(output);
        break;
    }
  }
}

/** Root logger instance. Use `logger.child({ module: "..." })` for scoped logging. */
export const logger = new Logger();
