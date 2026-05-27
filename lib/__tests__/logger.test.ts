/**
 * Unit tests for lib/logger.ts
 *
 * Validates structured logging output, level filtering, child context
 * inheritance, error serialization, and userId redaction behavior.
 *
 * Because the Logger class resolves environment at construction time,
 * tests reset modules and dynamically re-import to control NODE_ENV/LOG_LEVEL.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Helper: dynamically import the logger module after env manipulation
async function importLogger() {
  const mod = await import("../logger");
  return mod;
}

// Helper: TypeScript marks some process.env keys as readonly, so tests update env through a mutable view.
function setEnv(key: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) {
    delete env[key];
    return;
  }
  env[key] = value;
}

describe("logger — structured server-side logging", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    // Default to development mode unless a test overrides
    setEnv("NODE_ENV", "development");
    setEnv("LOG_LEVEL", undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // ─── info output ─────────────────────────────────────────────────────────

  describe("info level output in development", () => {
    it("emits a human-readable string to console.info", async () => {
      // Given: development environment with default log level
      const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
      const { logger } = await importLogger();

      // When: an info message is logged
      logger.info("User signed up", { module: "auth", event: "signup" });

      // Then: console.info is called with a formatted string containing the message
      expect(spy).toHaveBeenCalledTimes(1);
      const output = spy.mock.calls[0][0] as string;
      expect(output).toContain("INFO");
      expect(output).toContain("[auth]");
      expect(output).toContain("User signed up");
      expect(output).toContain("(signup)");
    });
  });

  // ─── level filtering ─────────────────────────────────────────────────────

  describe("level filtering suppresses lower-priority messages", () => {
    it("suppresses debug when LOG_LEVEL is info", async () => {
      // Given: LOG_LEVEL is set to info, filtering out debug
      setEnv("LOG_LEVEL", "info");
      const spy = vi.spyOn(console, "debug").mockImplementation(() => undefined);
      const { logger } = await importLogger();

      // When: a debug message is logged
      logger.debug("verbose trace data");

      // Then: console.debug is never called
      expect(spy).not.toHaveBeenCalled();
    });

    it("allows info when LOG_LEVEL is info", async () => {
      // Given: LOG_LEVEL is info
      setEnv("LOG_LEVEL", "info");
      const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
      const { logger } = await importLogger();

      // When: an info message is logged
      logger.info("allowed message");

      // Then: output is emitted
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("suppresses warn and info when LOG_LEVEL is error", async () => {
      // Given: LOG_LEVEL is error — only error passes
      setEnv("LOG_LEVEL", "error");
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
      const { logger } = await importLogger();

      // When: messages at different levels are logged
      logger.info("should be suppressed");
      logger.warn("should be suppressed too");
      logger.error("this should appear");

      // Then: only error reaches output
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ─── error serialization ──────────────────────────────────────────────────

  describe("error serialization", () => {
    it("serializes Error objects with name, message, and code", async () => {
      // Given: an Error with a custom code property
      const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const { logger } = await importLogger();
      const err = Object.assign(new Error("DB connection lost"), { code: "ECONNRESET" });

      // When: logged with error context
      logger.error("Operation failed", { error: err });

      // Then: output includes serialized error fields
      expect(spy).toHaveBeenCalledTimes(1);
      const output = spy.mock.calls[0][0] as string;
      expect(output).toContain("DB connection lost");
      expect(output).toContain("ECONNRESET");
    });

    it("includes stack trace in non-production mode", async () => {
      // Given: development environment
      setEnv("NODE_ENV", "development");
      const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const { logger } = await importLogger();

      // When: an error is logged
      logger.error("fail", { error: new Error("test stack") });

      // Then: stack appears in output
      const output = spy.mock.calls[0][0] as string;
      expect(output).toContain("stack");
    });

    it("excludes stack trace in production mode", async () => {
      // Given: production environment
      setEnv("NODE_ENV", "production");
      const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const { logger } = await importLogger();

      // When: an error is logged
      logger.error("fail", { error: new Error("secret stack") });

      // Then: output is JSON and does NOT include stack
      const output = spy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.error).toBeDefined();
      expect(parsed.error.name).toBe("Error");
      expect(parsed.error.message).toBe("secret stack");
      expect(parsed.error.stack).toBeUndefined();
    });
  });

  // ─── child logger ─────────────────────────────────────────────────────────

  describe("child logger inherits and merges context", () => {
    it("includes parent module in output when child logs", async () => {
      // Given: a child logger scoped to a module
      const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
      const { logger } = await importLogger();
      const child = logger.child({ module: "habits" });

      // When: the child logs a message
      child.info("Habit created", { event: "habit.create" });

      // Then: output includes the module from child context
      const output = spy.mock.calls[0][0] as string;
      expect(output).toContain("[habits]");
      expect(output).toContain("Habit created");
      expect(output).toContain("(habit.create)");
    });

    it("child context overrides parent context for same keys", async () => {
      // Given: parent has module "app", child overrides to "auth"
      const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
      const { logger } = await importLogger();
      const parent = logger.child({ module: "app" });
      const child = parent.child({ module: "auth" });

      // When: child logs
      child.info("Login");

      // Then: child module wins
      const output = spy.mock.calls[0][0] as string;
      expect(output).toContain("[auth]");
      expect(output).not.toContain("[app]");
    });
  });

  // ─── userId redaction ─────────────────────────────────────────────────────

  describe("userId in context is automatically redacted", () => {
    it("truncates userId in log output to first 8 chars", async () => {
      // Given: a long userId in log context
      const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
      const { logger } = await importLogger();

      // When: logged with userId context
      logger.info("Action performed", { userId: "clx9abc12def34gh56" });

      // Then: output contains truncated userId, not the full value
      const output = spy.mock.calls[0][0] as string;
      expect(output).toContain("clx9abc1...");
      expect(output).not.toContain("clx9abc12def34gh56");
    });
  });

  // ─── production JSON format ───────────────────────────────────────────────

  describe("production output is structured JSON", () => {
    it("emits a valid JSON string to console.info in production", async () => {
      // Given: production environment
      setEnv("NODE_ENV", "production");
      const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
      const { logger } = await importLogger();

      // When: an info message is logged
      logger.info("Deployed", { module: "deploy", event: "app.start" });

      // Then: output is parseable JSON with expected fields
      expect(spy).toHaveBeenCalledTimes(1);
      const output = spy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe("info");
      expect(parsed.message).toBe("Deployed");
      expect(parsed.event).toBe("app.start");
      expect(parsed.timestamp).toBeDefined();
    });

    it("includes redacted userId in JSON output", async () => {
      // Given: production mode with userId context
      setEnv("NODE_ENV", "production");
      const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
      const { logger } = await importLogger();

      // When: logged with a long userId
      logger.info("check-in", { userId: "abcdefghijklmnop" });

      // Then: JSON output contains truncated userId
      const output = spy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.userId).toBe("abcdefgh...");
    });
  });
});
