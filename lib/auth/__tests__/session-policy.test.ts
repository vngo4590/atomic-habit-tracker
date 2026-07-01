import { describe, expect, it } from "vitest";

import {
  SESSION_MAX_AGE_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
  isSessionRevoked,
} from "@/lib/auth/session-policy";

describe("session policy", () => {
  // Given the persistent-login design / When reading the window constants /
  // Then the max age is long and the update age is short, which together make
  // the session window slide forward on activity instead of hard-expiring.
  it("uses a long sliding window so active users are not forced to re-login", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
    expect(SESSION_UPDATE_AGE_SECONDS).toBe(24 * 60 * 60);
    expect(SESSION_UPDATE_AGE_SECONDS).toBeLessThan(SESSION_MAX_AGE_SECONDS);
  });
});

describe("isSessionRevoked", () => {
  // Given a user who has never signed out everywhere (no cutoff) /
  // When checking any session / Then it is never treated as revoked.
  it("treats sessions as valid when there is no revocation cutoff", () => {
    expect(isSessionRevoked(Date.now(), null)).toBe(false);
    expect(isSessionRevoked(undefined, null)).toBe(false);
  });

  // Given a revocation cutoff / When the session was issued before it /
  // Then the session is revoked.
  it("revokes sessions issued before the cutoff", () => {
    const cutoff = new Date(2_000);
    expect(isSessionRevoked(1_000, cutoff)).toBe(true);
  });

  // Given a revocation cutoff / When the session was issued at or after it /
  // Then the session remains valid (e.g. the fresh sign-in after a global logout).
  it("keeps sessions issued at or after the cutoff", () => {
    const cutoff = new Date(2_000);
    expect(isSessionRevoked(2_000, cutoff)).toBe(false);
    expect(isSessionRevoked(3_000, cutoff)).toBe(false);
  });

  // Given a session whose issue time exactly equals the cutoff /
  // When checking it / Then it is NOT revoked. This equality boundary is the
  // linchpin of the password-change fix: after a change, the current device's
  // refreshed authTime can land exactly on `sessionsValidFrom`, and the strict
  // `<` comparison must treat that as valid (a future switch to `<=` would
  // silently re-break the current device).
  it("does not revoke a session issued at the exact cutoff (strict < boundary)", () => {
    const cutoff = new Date(2_000);
    expect(isSessionRevoked(2_000, cutoff)).toBe(false);
    // One millisecond earlier is revoked; one millisecond later is valid.
    expect(isSessionRevoked(1_999, cutoff)).toBe(true);
    expect(isSessionRevoked(2_001, cutoff)).toBe(false);
  });

  // Given a revocation cutoff but a legacy session with no issue time /
  // When checking it / Then it fails closed and is revoked.
  it("fails closed when a revoked user's session has no issue time", () => {
    expect(isSessionRevoked(undefined, new Date(2_000))).toBe(true);
    expect(isSessionRevoked(null, new Date(2_000))).toBe(true);
  });
});
