/**
 * Redaction utilities for safe logging.
 *
 * This module provides field-level redaction so that sensitive information
 * (passwords, tokens, emails, user IDs) never appears in plain text in logs.
 * Used by both the server and client loggers.
 */

/** Fields whose values must be fully replaced with "[REDACTED]". */
const FULL_REDACT_KEYS = new Set([
  "password",
  "passwordHash",
  "newPassword",
  "currentPassword",
  "secret",
  "token",
  "accessToken",
  "refreshToken",
  "authSecret",
  "databaseUrl",
  "connectionString",
]);

/** Fields whose values receive partial masking (email-style). */
const EMAIL_KEYS = new Set(["email", "userEmail"]);

/** Fields whose values are truncated for correlation without full exposure. */
const ID_TRUNCATE_KEYS = new Set(["userId", "actorId"]);

/**
 * Partially mask an email address for logging.
 * Example: "alice@example.com" → "a***@example.com"
 */
export function redactEmail(email: string): string {
  if (!email || typeof email !== "string") return "[REDACTED]";
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return "[REDACTED]";
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  // Show first char + mask the rest
  return local[0] + "***" + domain;
}

/**
 * Truncate a user ID for correlation purposes.
 * Shows first 8 characters to allow log correlation without exposing the full ID.
 */
export function redactUserId(id: string): string {
  if (!id || typeof id !== "string") return "[unknown]";
  if (id.length <= 8) return id;
  return id.slice(0, 8) + "...";
}

/**
 * Recursively redact sensitive fields from an object.
 * Returns a new object safe for logging.
 *
 * Prefer using allowlisted fields directly in log calls — this is a safety net
 * for cases where structured context might contain unexpected sensitive data.
 */
export function redactObject(obj: unknown, depth = 0): unknown {
  // Prevent infinite recursion on deeply nested objects
  if (depth > 5) return "[nested]";

  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return obj;
  if (typeof obj === "number" || typeof obj === "boolean") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, depth + 1));
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (FULL_REDACT_KEYS.has(key)) {
        result[key] = "[REDACTED]";
      } else if (EMAIL_KEYS.has(key) && typeof value === "string") {
        result[key] = redactEmail(value);
      } else if (ID_TRUNCATE_KEYS.has(key) && typeof value === "string") {
        result[key] = redactUserId(value);
      } else {
        result[key] = redactObject(value, depth + 1);
      }
    }
    return result;
  }

  return "[unserializable]";
}
