import { describe, expect, it } from "vitest";

import type { JWT } from "next-auth/jwt";

import { stampAuthToken } from "@/lib/auth/token";

describe("stampAuthToken (jwt callback logic)", () => {
  // Given an initial sign-in (a user is present) /
  // When the token is stamped /
  // Then the user id and the sign-in time are recorded on the token.
  it("stamps the id and authTime once on initial sign-in", () => {
    const token: JWT = {};
    const now = () => 1_000;

    const result = stampAuthToken({ token, user: { id: "user_1" }, trigger: "signIn" }, now);

    expect(result.id).toBe("user_1");
    expect(result.authTime).toBe(1_000);
  });

  // Given an explicit session update (the update trigger fired) /
  // When the token is re-stamped /
  // Then authTime is refreshed to the current moment so the current device can
  // survive a freshly-advanced revocation cutoff.
  it("re-stamps authTime to now on an update trigger", () => {
    const token: JWT = { id: "user_1", authTime: 1_000 };
    const now = () => 5_000;

    const result = stampAuthToken({ token, trigger: "update" }, now);

    expect(result.authTime).toBe(5_000);
    // The id is preserved (an update never carries a user).
    expect(result.id).toBe("user_1");
  });

  // Given an ordinary token slide (no user, no update trigger) /
  // When the callback runs / Then the existing authTime is preserved unchanged.
  it("preserves the existing authTime on an ordinary slide", () => {
    const token: JWT = { id: "user_1", authTime: 1_000 };
    const now = () => 9_999;

    const result = stampAuthToken({ token, trigger: undefined }, now);

    expect(result.authTime).toBe(1_000);
    expect(result.id).toBe("user_1");
  });

  // Given a slide with no user and an undefined trigger and no prior authTime /
  // When the callback runs / Then no authTime is invented (stays undefined).
  it("does not invent an authTime on a slide with no prior stamp", () => {
    const token: JWT = { id: "user_1" };

    const result = stampAuthToken({ token }, () => 9_999);

    expect(result.authTime).toBeUndefined();
  });
});
