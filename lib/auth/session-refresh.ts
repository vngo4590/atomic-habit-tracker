import { SESSION_UPDATE_AGE_SECONDS } from "@/lib/auth/session-policy";

/**
 * Session-cookie refresh throttling for the proxy.
 *
 * With the JWT strategy, Auth.js re-encodes the session and appends a fresh
 * `authjs.session-token` Set-Cookie to EVERY proxied response — it ignores
 * `session.updateAge`. Besides the churn, that is a sign-out bug: any request
 * still in flight when the user signs out (Next.js link prefetches fire
 * constantly in the background) can land after the logout response and write
 * the old session straight back, so the user sees /login but is still signed
 * in. The proxy therefore only lets the cookie through once the current token
 * is at least `SESSION_UPDATE_AGE_SECONDS` old — exactly the sliding cadence
 * documented in session-policy.ts.
 */

/** Matches `authjs.session-token`, its `__Secure-` variant, and chunked parts (`.0`, `.1`…). */
const SESSION_TOKEN_COOKIE = /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?=/;

/**
 * The issue time (epoch ms) of the session's current token, as surfaced on the
 * session by the `session` callback in auth.ts, or undefined if unknown.
 */
export function sessionIssuedAt(auth: unknown): number | undefined {
  if (!auth || typeof auth !== "object") return undefined;
  const issuedAt = (auth as { issuedAt?: unknown }).issuedAt;
  return typeof issuedAt === "number" ? issuedAt : undefined;
}

/**
 * True when the session token issued at `issuedAtMs` is due to be re-issued.
 * Unknown issue times (no session, legacy token) always refresh so Auth.js can
 * still clear or replace broken cookies.
 */
export function shouldRefreshSessionCookie(issuedAtMs: number | null | undefined, now: number = Date.now()): boolean {
  if (typeof issuedAtMs !== "number" || !Number.isFinite(issuedAtMs)) return true;
  return now - issuedAtMs >= SESSION_UPDATE_AGE_SECONDS * 1000;
}

/**
 * Remove any session-token Set-Cookie headers from `response`, keeping every
 * other cookie (CSRF, callback URL…) intact. Mutates and returns `response`.
 */
export function withoutSessionRefresh<T extends Response>(response: T): T {
  const cookies = response.headers.getSetCookie();
  const kept = cookies.filter((cookie) => !SESSION_TOKEN_COOKIE.test(cookie));
  if (kept.length === cookies.length) return response;

  response.headers.delete("set-cookie");
  for (const cookie of kept) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}
