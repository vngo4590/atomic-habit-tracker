import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { hasSessionUser, isProtectedPath, loginRedirectUrl } from "@/lib/auth/routes";
import {
  STATIC_SECURITY_HEADERS,
  STRICT_TRANSPORT_SECURITY,
  buildContentSecurityPolicy,
  generateNonce,
} from "@/lib/security/headers";
import {
  AUTH_RATE_LIMIT,
  API_RATE_LIMIT,
  classifyRateLimit,
  isAllowedCrossOrigin,
} from "@/lib/security/policy";
import { clientIpFromHeaders, createRateLimiter } from "@/lib/security/rate-limit";

/**
 * Security Proxy (Next.js 16 `proxy.ts`, formerly "middleware").
 *
 * Runs on every matched request and layers four protections on top of the
 * existing auth-redirect behaviour:
 *   1. Rate limiting    — throttles brute-force auth and API abuse per client IP.
 *   2. CSRF guard       — rejects cross-origin state-changing API requests.
 *   3. CSP + nonce      — injects a strict, per-request Content-Security-Policy.
 *   4. Security headers — HSTS, anti-clickjacking, nosniff, etc. on every response.
 *
 * The rate-limiter counters live in module scope so they persist across requests
 * within this single App Service instance (see lib/security/rate-limit.ts for the
 * single-instance trade-off note).
 */

const isDev = process.env.NODE_ENV === "development";

// Turnstile is enabled when a public site key is configured. The proxy only
// needs to know whether to widen the CSP for the challenge widget/iframe.
const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

// Two independent limiters: a strict one for auth attempts and a gentler one for
// the API. Module-scoped so their state survives between requests on this instance.
const authLimiter = createRateLimiter(AUTH_RATE_LIMIT);
const apiLimiter = createRateLimiter(API_RATE_LIMIT);

/** Stamps the static security headers + HSTS + CSP onto an outgoing response. */
function applySecurityHeaders(response: NextResponse, csp: string): NextResponse {
  for (const [name, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  response.headers.set("Strict-Transport-Security", STRICT_TRANSPORT_SECURITY);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export default auth((request: NextRequest & { auth?: unknown }) => {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // A fresh nonce + CSP per request. The nonce is also forwarded on the request
  // headers so Next.js can stamp it onto its own server-rendered scripts.
  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy(nonce, isDev, { turnstile: turnstileEnabled });

  // --- 1. Rate limiting -----------------------------------------------------
  // Identify the bucket first so we only spend a counter slot on limited paths.
  const bucket = classifyRateLimit(pathname, method);
  if (bucket) {
    const ip = clientIpFromHeaders(request.headers);
    const limiter = bucket === "auth" ? authLimiter : apiLimiter;
    const decision = limiter.check(`${bucket}:${ip}`);
    if (!decision.allowed) {
      // 429 with Retry-After so well-behaved clients back off.
      const tooMany = NextResponse.json(
        {
          ok: false,
          error: { code: "rate_limited", message: "Too many requests. Try again shortly." },
        },
        { status: 429 },
      );
      tooMany.headers.set("Retry-After", String(decision.retryAfterSeconds));
      return applySecurityHeaders(tooMany, csp);
    }
  }

  // --- 2. CSRF / same-origin guard for state-changing API requests ----------
  if (
    !isAllowedCrossOrigin(
      method,
      pathname,
      request.headers.get("origin"),
      request.headers.get("host"),
    )
  ) {
    const forbidden = NextResponse.json(
      {
        ok: false,
        error: { code: "cross_origin_blocked", message: "Cross-origin request rejected." },
      },
      { status: 403 },
    );
    return applySecurityHeaders(forbidden, csp);
  }

  // --- 3. Auth redirect (preserved original behaviour) ----------------------
  const hasSession = hasSessionUser(request.auth);
  if (!hasSession && isProtectedPath(pathname)) {
    const redirect = NextResponse.redirect(loginRedirectUrl(request.url));
    return applySecurityHeaders(redirect, csp);
  }

  // --- 4. Forward the nonce on the request, set headers on the response ------
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return applySecurityHeaders(response, csp);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
