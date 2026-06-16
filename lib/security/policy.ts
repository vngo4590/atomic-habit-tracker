/**
 * Request-classification policy for the security Proxy.
 *
 * WHAT: Pure helper functions that decide (a) which rate-limit bucket a request
 * belongs to and (b) whether a state-changing API request passes a same-origin
 * (CSRF) check. WHY: Keeping these as pure functions — separate from the Proxy
 * runtime wiring — makes the security decisions unit-testable without spinning up
 * the Edge runtime.
 */

/**
 * Rate-limit budgets. Tuned for a small app on a single instance:
 *   • AUTH is strict because each attempt runs bcrypt and is the brute-force /
 *     credential-stuffing target.
 *   • API is looser to allow normal interactive use while still capping abuse.
 * The durable volumetric layer is the Front Door WAF rate-limit rule; these are
 * the in-process backstop.
 */
export const AUTH_RATE_LIMIT = { limit: 10, windowMs: 5 * 60 * 1000 } as const;
export const API_RATE_LIMIT = { limit: 100, windowMs: 60 * 1000 } as const;

/** The rate-limit bucket a request maps to, or null when it is not limited. */
export type RateLimitBucket = "auth" | "api" | null;

/**
 * HTTP methods that change state and therefore need CSRF protection. Safe,
 * idempotent reads (GET/HEAD/OPTIONS) are excluded.
 */
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Decides which rate-limit bucket a request falls into.
 *
 * Auth attempts (the credential callback and the register/login server actions)
 * are the most security-sensitive, so any POST to those paths is throttled hard.
 * Everything under the versioned `/api/v1` surface is throttled with the gentler
 * API budget. All other requests (page navigations, static assets) are not
 * rate-limited here.
 *
 * @param pathname - request path (no query string).
 * @param method - HTTP method, upper-case.
 */
export function classifyRateLimit(pathname: string, method: string): RateLimitBucket {
  const upper = method.toUpperCase();

  // NextAuth credential verification + the email/password auth forms.
  const isAuthSurface =
    pathname.startsWith("/api/auth") || pathname === "/login" || pathname === "/register";
  if (isAuthSurface && upper === "POST") {
    return "auth";
  }

  // The mobile/external REST surface.
  if (pathname.startsWith("/api/v1")) {
    return "api";
  }

  return null;
}

/**
 * Same-origin (CSRF) guard for state-changing API requests.
 *
 * The `/api/v1` routes authenticate with the session cookie, which the browser
 * attaches automatically — the classic CSRF setup. We therefore require that any
 * unsafe request which DOES carry an `Origin` header (i.e. a browser) has an
 * Origin matching our own host. Non-browser clients (native mobile, server-to-
 * server) typically omit `Origin` and are unaffected, so this adds protection
 * without breaking legitimate API consumers.
 *
 * @returns true when the request may proceed, false when it must be rejected.
 */
export function isAllowedCrossOrigin(
  method: string,
  pathname: string,
  originHeader: string | null,
  hostHeader: string | null,
): boolean {
  // Only guard unsafe methods against our own API surface.
  if (!UNSAFE_METHODS.has(method.toUpperCase()) || !pathname.startsWith("/api/")) {
    return true;
  }

  // No Origin header → not a browser-driven cross-site form post; allow it.
  if (!originHeader) {
    return true;
  }

  try {
    const originHost = new URL(originHeader).host;
    // Reject when the browser's Origin host differs from the request's host.
    return Boolean(hostHeader) && originHost === hostHeader;
  } catch {
    // A malformed Origin header is treated as hostile.
    return false;
  }
}
