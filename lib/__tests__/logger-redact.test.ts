/**
 * Unit tests for lib/logger-redact.ts
 *
 * Validates that sensitive data redaction behaves correctly for emails,
 * user IDs, and arbitrary objects containing sensitive keys.
 */

import { describe, it, expect } from "vitest";

import { redactEmail, redactUserId, redactObject } from "../logger-redact";

// ─── redactEmail ─────────────────────────────────────────────────────────────

describe("redactEmail — partial masking of email addresses", () => {
  describe("happy path", () => {
    it("masks a normal email keeping first local char and full domain", () => {
      // Given: a standard email address
      const email = "alice@example.com";

      // When: the email is redacted
      const result = redactEmail(email);

      // Then: first char of local part is visible, rest is masked, domain intact
      expect(result).toBe("a***@example.com");
    });

    it("masks an email with a single-char local part", () => {
      // Given: an email whose local part is just one character
      const email = "x@domain.io";

      // When: redacted
      const result = redactEmail(email);

      // Then: the single char is kept, mask applied, domain intact
      expect(result).toBe("x***@domain.io");
    });
  });

  describe("invalid or missing input returns [REDACTED]", () => {
    it("returns [REDACTED] for an empty string", () => {
      // Given: an empty string input
      // When: redacted
      const result = redactEmail("");

      // Then: the sentinel value is returned
      expect(result).toBe("[REDACTED]");
    });

    it("returns [REDACTED] for null input", () => {
      // Given: a null value cast as string (runtime safety)
      // When: redacted
      const result = redactEmail(null as unknown as string);

      // Then: the sentinel value is returned
      expect(result).toBe("[REDACTED]");
    });

    it("returns [REDACTED] for undefined input", () => {
      // Given: undefined cast as string
      // When: redacted
      const result = redactEmail(undefined as unknown as string);

      // Then: sentinel returned
      expect(result).toBe("[REDACTED]");
    });

    it("returns [REDACTED] for a non-string input", () => {
      // Given: a numeric value
      // When: redacted
      const result = redactEmail(12345 as unknown as string);

      // Then: sentinel returned
      expect(result).toBe("[REDACTED]");
    });

    it("returns [REDACTED] when there is no @ symbol", () => {
      // Given: a string without an @ character
      // When: redacted
      const result = redactEmail("not-an-email");

      // Then: sentinel returned because it's not a valid email shape
      expect(result).toBe("[REDACTED]");
    });

    it("returns [REDACTED] when @ is at position 0", () => {
      // Given: an @ at the start means empty local part
      // When: redacted
      const result = redactEmail("@example.com");

      // Then: sentinel returned — no local part to mask
      expect(result).toBe("[REDACTED]");
    });
  });
});

// ─── redactUserId ────────────────────────────────────────────────────────────

describe("redactUserId — truncation for correlation without full exposure", () => {
  describe("happy path", () => {
    it("truncates a UUID-length string to first 8 chars + ellipsis", () => {
      // Given: a typical UUID-style user ID
      const id = "clx9abc12def34gh56ij78kl";

      // When: redacted
      const result = redactUserId(id);

      // Then: only the first 8 characters are visible for correlation
      expect(result).toBe("clx9abc1...");
    });

    it("returns a short ID (<=8 chars) unchanged", () => {
      // Given: a short ID that fits within the safe window
      const id = "usr_1234";

      // When: redacted
      const result = redactUserId(id);

      // Then: no truncation is needed
      expect(result).toBe("usr_1234");
    });

    it("returns an exactly 8-char ID unchanged", () => {
      // Given: boundary — exactly 8 characters
      const id = "12345678";

      // When: redacted
      const result = redactUserId(id);

      // Then: no truncation
      expect(result).toBe("12345678");
    });

    it("truncates a 9-char ID", () => {
      // Given: boundary — one char over threshold
      const id = "123456789";

      // When: redacted
      const result = redactUserId(id);

      // Then: truncated
      expect(result).toBe("12345678...");
    });
  });

  describe("invalid or missing input returns [unknown]", () => {
    it("returns [unknown] for an empty string", () => {
      // Given: empty string
      // When: redacted
      const result = redactUserId("");

      // Then: sentinel
      expect(result).toBe("[unknown]");
    });

    it("returns [unknown] for null", () => {
      // Given: null
      // When: redacted
      const result = redactUserId(null as unknown as string);

      // Then: sentinel
      expect(result).toBe("[unknown]");
    });

    it("returns [unknown] for undefined", () => {
      // Given: undefined
      // When: redacted
      const result = redactUserId(undefined as unknown as string);

      // Then: sentinel
      expect(result).toBe("[unknown]");
    });

    it("returns [unknown] for a non-string value", () => {
      // Given: a number mistakenly passed
      // When: redacted
      const result = redactUserId(42 as unknown as string);

      // Then: sentinel
      expect(result).toBe("[unknown]");
    });
  });
});

// ─── redactObject ────────────────────────────────────────────────────────────

describe("redactObject — recursive field-level redaction of objects", () => {
  describe("full-redact keys are replaced with [REDACTED]", () => {
    it("redacts password fields", () => {
      // Given: an object with a password
      const obj = { username: "bob", password: "s3cret!" };

      // When: redacted
      const result = redactObject(obj);

      // Then: password is fully replaced, username is untouched
      expect(result).toEqual({ username: "bob", password: "[REDACTED]" });
    });

    it("redacts all secret/token variants", () => {
      // Given: multiple sensitive keys
      const obj = {
        secret: "abc",
        token: "xyz",
        accessToken: "at",
        refreshToken: "rt",
        passwordHash: "hash",
        newPassword: "new",
        currentPassword: "cur",
        authSecret: "as",
        databaseUrl: "postgres://...",
        connectionString: "Server=...",
      };

      // When: redacted
      const result = redactObject(obj) as Record<string, unknown>;

      // Then: every sensitive key is fully replaced
      for (const key of Object.keys(obj)) {
        expect(result[key]).toBe("[REDACTED]");
      }
    });
  });

  describe("email keys receive partial masking", () => {
    it("masks the email field using redactEmail logic", () => {
      // Given: an object with an email field
      const obj = { email: "bob@company.co", name: "Bob" };

      // When: redacted
      const result = redactObject(obj);

      // Then: email is masked, name is preserved
      expect(result).toEqual({ email: "b***@company.co", name: "Bob" });
    });

    it("masks the userEmail field", () => {
      // Given: userEmail variant
      const obj = { userEmail: "jane@test.org" };

      // When: redacted
      const result = redactObject(obj);

      // Then: masked
      expect(result).toEqual({ userEmail: "j***@test.org" });
    });
  });

  describe("ID keys are truncated", () => {
    it("truncates userId to first 8 chars", () => {
      // Given: an object with a long userId
      const obj = { userId: "abcdefghijklmnop" };

      // When: redacted
      const result = redactObject(obj);

      // Then: truncated
      expect(result).toEqual({ userId: "abcdefgh..." });
    });

    it("truncates actorId to first 8 chars", () => {
      // Given: actorId key
      const obj = { actorId: "actor_9876543210" };

      // When: redacted
      const result = redactObject(obj);

      // Then: truncated
      expect(result).toEqual({ actorId: "actor_98..." });
    });
  });

  describe("primitives and null pass through unchanged", () => {
    it("passes a plain string through", () => {
      // Given: a bare string
      // When: redacted
      // Then: unchanged
      expect(redactObject("hello")).toBe("hello");
    });

    it("passes a number through", () => {
      // Given/When/Then
      expect(redactObject(42)).toBe(42);
    });

    it("passes a boolean through", () => {
      // Given/When/Then
      expect(redactObject(true)).toBe(true);
    });

    it("passes null through", () => {
      // Given/When/Then
      expect(redactObject(null)).toBeNull();
    });

    it("passes undefined through", () => {
      // Given/When/Then
      expect(redactObject(undefined)).toBeUndefined();
    });
  });

  describe("nested objects and arrays", () => {
    it("recursively redacts nested objects", () => {
      // Given: a nested structure with sensitive fields at depth 2
      const obj = {
        user: { email: "deep@test.com", password: "x" },
        safe: "value",
      };

      // When: redacted
      const result = redactObject(obj);

      // Then: nested sensitive fields are handled
      expect(result).toEqual({
        user: { email: "d***@test.com", password: "[REDACTED]" },
        safe: "value",
      });
    });

    it("recursively processes arrays of objects", () => {
      // Given: an array containing objects with sensitive keys
      const obj = { users: [{ password: "a" }, { token: "b" }] };

      // When: redacted
      const result = redactObject(obj);

      // Then: each array element is redacted
      expect(result).toEqual({
        users: [{ password: "[REDACTED]" }, { token: "[REDACTED]" }],
      });
    });

    it("handles arrays of primitives unchanged", () => {
      // Given: an array of plain strings
      const obj = { tags: ["a", "b", "c"] };

      // When: redacted
      const result = redactObject(obj);

      // Then: array is preserved
      expect(result).toEqual({ tags: ["a", "b", "c"] });
    });
  });

  describe("recursion depth cap", () => {
    it("returns [nested] when depth exceeds 5", () => {
      // Given: an object nested to depth 7
      const deep = { a: { b: { c: { d: { e: { f: { g: "value" } } } } } } };

      // When: redacted
      const result = redactObject(deep) as Record<string, unknown>;

      // Then: once depth 5 is exceeded, remaining nested content becomes [nested]
      // depth 0: top → depth 1: a → depth 2: b → depth 3: c → depth 4: d → depth 5: e → depth 6: f exceeds
      const a = result.a as Record<string, unknown>;
      const b = a.b as Record<string, unknown>;
      const c = b.c as Record<string, unknown>;
      const d = c.d as Record<string, unknown>;
      const e = d.e as Record<string, unknown>;
      expect(e.f).toBe("[nested]");
    });
  });
});
