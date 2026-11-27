import { describe, expect, it } from "vitest";

import { SESSION_UPDATE_AGE_SECONDS } from "@/lib/auth/session-policy";
import { sessionIssuedAt, shouldRefreshSessionCookie, withoutSessionRefresh } from "@/lib/auth/session-refresh";

const NOW = Date.UTC(2025, 0, 15, 12, 0, 0);
const UPDATE_AGE_MS = SESSION_UPDATE_AGE_SECONDS * 1000;

function responseWithCookies(cookies: string[]): Response {
  const response = new Response(null, { status: 200 });
  for (const cookie of cookies) response.headers.append("set-cookie", cookie);
  return response;
}

describe("sliding session cookie refresh", () => {
  describe("shouldRefreshSessionCookie", () => {
    it("keeps a freshly issued session as-is so in-flight requests cannot undo a sign-out", () => {
      // Given: a token minted a minute ago
      // Then: the proxy must not re-issue the cookie yet
      expect(shouldRefreshSessionCookie(NOW - 60_000, NOW)).toBe(false);
    });

    it("re-issues the cookie once the token reaches the update age, keeping active users signed in", () => {
      // Given: tokens exactly at and past the sliding update age
      // Then: both are refreshed so the 30-day idle window slides forward
      expect(shouldRefreshSessionCookie(NOW - UPDATE_AGE_MS, NOW)).toBe(true);
      expect(shouldRefreshSessionCookie(NOW - UPDATE_AGE_MS - 1, NOW)).toBe(true);
    });

    it("always lets Auth.js write the cookie when the issue time is unknown", () => {
      // Given: no session, or a legacy token without an issue time
      // Then: Auth.js may still clear or replace the cookie
      expect(shouldRefreshSessionCookie(undefined, NOW)).toBe(true);
      expect(shouldRefreshSessionCookie(null, NOW)).toBe(true);
      expect(shouldRefreshSessionCookie(Number.NaN, NOW)).toBe(true);
    });
  });

  describe("sessionIssuedAt", () => {
    it("reads the token issue time surfaced on the session", () => {
      // Given: a session produced by the auth.ts session callback
      // Then: its issue time is returned, and malformed sessions yield undefined
      expect(sessionIssuedAt({ user: { id: "u1" }, issuedAt: NOW })).toBe(NOW);
      expect(sessionIssuedAt({ user: { id: "u1" } })).toBeUndefined();
      expect(sessionIssuedAt(null)).toBeUndefined();
      expect(sessionIssuedAt({ issuedAt: "yesterday" })).toBeUndefined();
    });
  });

  describe("withoutSessionRefresh", () => {
    it("drops the session-token cookie but keeps other auth cookies", () => {
      // Given: a response carrying a re-issued session plus a CSRF cookie
      const response = responseWithCookies([
        "authjs.session-token=stale; Path=/; HttpOnly",
        "authjs.csrf-token=abc; Path=/",
      ]);

      // When: the session refresh is stripped
      withoutSessionRefresh(response);

      // Then: only the non-session cookie survives
      expect(response.headers.getSetCookie()).toEqual(["authjs.csrf-token=abc; Path=/"]);
    });

    it("also drops secure-prefixed and chunked session-token cookies", () => {
      // Given: a production (HTTPS) response whose large session was chunked
      const response = responseWithCookies([
        "__Secure-authjs.session-token.0=part0; Path=/; Secure",
        "__Secure-authjs.session-token.1=part1; Path=/; Secure",
      ]);

      // When: the session refresh is stripped
      withoutSessionRefresh(response);

      // Then: no session cookie is written
      expect(response.headers.getSetCookie()).toEqual([]);
    });

    it("leaves a response without session cookies untouched", () => {
      // Given: a response with only a callback-url cookie
      const response = responseWithCookies(["authjs.callback-url=%2F; Path=/"]);

      // When / Then: the cookie is preserved as-is
      expect(withoutSessionRefresh(response).headers.getSetCookie()).toEqual(["authjs.callback-url=%2F; Path=/"]);
    });
  });
});
