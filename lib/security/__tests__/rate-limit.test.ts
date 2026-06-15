import { describe, expect, it } from "vitest";

import { clientIpFromHeaders, createRateLimiter } from "@/lib/security/rate-limit";

describe("createRateLimiter", () => {
  it("allows requests up to the limit then blocks within the same window", () => {
    // Given a limiter of 3 requests per 1000ms
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });

    // When the same key makes four requests inside the window
    const first = limiter.check("ip", 0);
    const second = limiter.check("ip", 100);
    const third = limiter.check("ip", 200);
    const fourth = limiter.check("ip", 300);

    // Then the first three are allowed with a decreasing remaining count
    expect(first).toMatchObject({ allowed: true, remaining: 2 });
    expect(second).toMatchObject({ allowed: true, remaining: 1 });
    expect(third).toMatchObject({ allowed: true, remaining: 0 });
    // And the fourth is blocked with a retry-after hint
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.retryAfterSeconds).toBe(1);
  });

  it("starts a fresh window once the previous one elapses", () => {
    // Given a limiter that has been exhausted
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.check("ip", 0).allowed).toBe(true);
    expect(limiter.check("ip", 500).allowed).toBe(false);

    // When the window has fully elapsed
    const afterReset = limiter.check("ip", 1000);

    // Then the caller is allowed again
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(0);
  });

  it("tracks distinct keys independently", () => {
    // Given a strict per-key limiter
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });

    // When two different IPs each make one request
    const a = limiter.check("ip-a", 0);
    const b = limiter.check("ip-b", 0);

    // Then both are allowed because budgets are per-key
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
    expect(limiter.size()).toBe(2);
  });

  it("prunes expired keys when the tracked-key cap is exceeded", () => {
    // Given a limiter that may track at most one key
    const limiter = createRateLimiter({ limit: 5, windowMs: 1000, maxKeys: 1 });

    // When an old key's window has expired and a new key arrives
    limiter.check("old", 0);
    const fresh = limiter.check("new", 2000);

    // Then the expired key is dropped so memory stays bounded
    expect(fresh.allowed).toBe(true);
    expect(limiter.size()).toBe(1);
  });
});

describe("clientIpFromHeaders", () => {
  it("prefers the Azure Front Door client IP header", () => {
    // Given headers from a request that traversed Front Door
    const headers = new Headers({
      "x-azure-clientip": "203.0.113.7",
      "x-forwarded-for": "10.0.0.1, 203.0.113.7",
    });

    // Then the trusted Azure header wins over x-forwarded-for
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("falls back to the first x-forwarded-for entry", () => {
    // Given only a forwarding chain
    const headers = new Headers({ "x-forwarded-for": "198.51.100.9, 10.0.0.5" });

    // Then the left-most (client) address is used
    expect(clientIpFromHeaders(headers)).toBe("198.51.100.9");
  });

  it("returns a stable sentinel when no IP header is present", () => {
    // Given a request with no IP-bearing headers
    expect(clientIpFromHeaders(new Headers())).toBe("unknown");
  });
});
