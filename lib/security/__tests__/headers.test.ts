import { describe, expect, it } from "vitest";

import {
  STATIC_SECURITY_HEADERS,
  STRICT_TRANSPORT_SECURITY,
  buildContentSecurityPolicy,
  generateNonce,
} from "@/lib/security/headers";

describe("generateNonce", () => {
  it("produces a unique, non-empty value each call", () => {
    // When two nonces are generated
    const a = generateNonce();
    const b = generateNonce();

    // Then each is a non-empty string and they differ
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });
});

describe("buildContentSecurityPolicy", () => {
  it("binds scripts to the request nonce with strict-dynamic", () => {
    // Given a CSP built for a production request
    const csp = buildContentSecurityPolicy("abc123", false);

    // Then only nonce'd scripts (and what they load) may execute
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    // And eval is NOT permitted in production
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("allows unsafe-eval only in development for React debugging", () => {
    // Given a CSP built for a development request
    const csp = buildContentSecurityPolicy("abc123", true);

    // Then eval is permitted so React can rebuild stack traces
    expect(csp).toContain("'unsafe-eval'");
  });

  it("allows inline styles for Framer Motion / Tailwind", () => {
    // Then style-src permits inline styles but without a nonce (which would
    // otherwise make the browser ignore 'unsafe-inline')
    const csp = buildContentSecurityPolicy("abc123", false);
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("style-src 'self' 'nonce-abc123'");
  });

  it("locks down framing, objects, and base URI", () => {
    // Then clickjacking and injection-prone directives are hardened
    const csp = buildContentSecurityPolicy("nonce", false);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("forbids all framing when Turnstile is disabled", () => {
    // Given Turnstile is off (default)
    const csp = buildContentSecurityPolicy("nonce", false);

    // Then no frame source is permitted and Cloudflare is not referenced
    expect(csp).toContain("frame-src 'none'");
    expect(csp).not.toContain("challenges.cloudflare.com");
  });

  it("allows the Turnstile widget and iframe only when Turnstile is enabled", () => {
    // Given a CSP built with Turnstile enabled
    const csp = buildContentSecurityPolicy("nonce", false, { turnstile: true });

    // Then the challenge host is permitted for frames, scripts, and connections
    expect(csp).toContain("frame-src https://challenges.cloudflare.com");
    expect(csp).toContain("script-src 'self' 'nonce-nonce' 'strict-dynamic' https://challenges.cloudflare.com");
    expect(csp).toContain("connect-src 'self' https://challenges.cloudflare.com");
    // And framing the app from elsewhere is still forbidden
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

describe("STATIC_SECURITY_HEADERS", () => {
  it("includes the core anti-XSS / anti-clickjacking headers", () => {
    // Then the conservative defaults are present
    expect(STATIC_SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    expect(STATIC_SECURITY_HEADERS["X-Frame-Options"]).toBe("DENY");
    expect(STATIC_SECURITY_HEADERS["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(STATIC_SECURITY_HEADERS["Cross-Origin-Opener-Policy"]).toBe("same-origin");
  });

  it("commits to HTTPS for two years without preload", () => {
    // Then HSTS is long-lived and covers subdomains, but is reversible
    expect(STRICT_TRANSPORT_SECURITY).toContain("max-age=63072000");
    expect(STRICT_TRANSPORT_SECURITY).toContain("includeSubDomains");
    expect(STRICT_TRANSPORT_SECURITY).not.toContain("preload");
  });
});
