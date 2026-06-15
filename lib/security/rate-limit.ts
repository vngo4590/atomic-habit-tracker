/**
 * In-memory, fixed-window rate limiter.
 *
 * WHAT: Counts how many requests a given "key" (usually the caller's IP address)
 * has made inside a rolling time window and decides whether the next request is
 * allowed. WHY: It is the application's first line of defence against brute-force
 * login attempts, credential stuffing, and noisy API abuse, before requests ever
 * touch the database or bcrypt.
 *
 * IMPORTANT TRADE-OFFS (documented so future maintainers understand the limits):
 *   • The counters live in this process's memory. They are correct only because
 *     Atomicly runs on a SINGLE App Service instance (numberOfWorkers: 1). If we
 *     ever scale out, counters will diverge per instance — move to a shared store
 *     (e.g. Redis / Upstash) at that point.
 *   • Counters reset when the process restarts (cold start). The Azure Front Door
 *     WAF rate-limit rule is the durable, volumetric DDoS layer; this limiter only
 *     blunts casual abuse that slips through.
 *   • IP keys are only trustworthy once App Service ingress is locked to our Front
 *     Door (see infra). Until then x-forwarded-for can be spoofed.
 */

/** A single key's counter inside the current window. */
interface WindowCounter {
  // Number of requests seen for this key in the active window.
  count: number;
  // Epoch-ms timestamp when the active window ends and the count resets.
  resetAt: number;
}

/** Options that define how strict a particular limiter is. */
export interface RateLimiterOptions {
  /** Maximum number of requests allowed per window. */
  limit: number;
  /** Length of the window in milliseconds. */
  windowMs: number;
  /**
   * Safety cap on how many distinct keys we track at once. Protects against
   * unbounded memory growth from a flood of unique (possibly spoofed) IPs.
   */
  maxKeys?: number;
}

/** The verdict returned for a single rate-limit check. */
export interface RateLimitDecision {
  /** True when the request is under the limit and may proceed. */
  allowed: boolean;
  /** The configured request ceiling for the window. */
  limit: number;
  /** How many requests remain in the current window (never negative). */
  remaining: number;
  /** Seconds the caller should wait before retrying (0 when allowed). */
  retryAfterSeconds: number;
}

/** A rate limiter instance with its own isolated counter store. */
export interface RateLimiter {
  /**
   * Records one request for `key` and returns whether it is allowed.
   * `now` is injectable so tests can advance time deterministically.
   */
  check: (key: string, now?: number) => RateLimitDecision;
  /** Number of keys currently tracked — exposed for tests/diagnostics. */
  size: () => number;
}

// Default ceiling on tracked keys: high enough for real traffic, low enough to
// bound memory if someone sprays us with unique source IPs.
const DEFAULT_MAX_KEYS = 10_000;

/**
 * Creates an independent rate limiter. Each caller (e.g. the login limiter vs
 * the API limiter) gets its own store so their budgets never interfere.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { limit, windowMs } = options;
  const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
  const store = new Map<string, WindowCounter>();

  /**
   * Drop every counter whose window has already ended. Called lazily only when
   * the store grows past its cap, so the common path stays O(1).
   */
  function pruneExpired(now: number): void {
    for (const [key, counter] of store) {
      if (counter.resetAt <= now) {
        store.delete(key);
      }
    }
  }

  function check(key: string, now: number = Date.now()): RateLimitDecision {
    const existing = store.get(key);

    // First request for this key, or the previous window has elapsed: start a
    // fresh window. This is the "reset" branch of the fixed-window algorithm.
    if (!existing || existing.resetAt <= now) {
      // Before inserting a brand-new key, make sure we are not leaking memory.
      if (!existing && store.size >= maxKeys) {
        pruneExpired(now);
      }
      store.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, limit, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    // We are inside an active window. Reject once the ceiling is reached.
    if (existing.count >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        // Round up so callers never retry a fraction of a second too early.
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      limit,
      remaining: limit - existing.count,
      retryAfterSeconds: 0,
    };
  }

  return { check, size: () => store.size };
}

/**
 * Extracts the most trustworthy client IP from request headers.
 *
 * Behind Azure Front Door, `x-azure-clientip` carries the real public client IP
 * and is set by Microsoft's edge (not the caller), so we prefer it. We fall back
 * to the left-most `x-forwarded-for` entry, then `x-real-ip`. When nothing is
 * present we return a stable sentinel so the limiter still functions (all such
 * requests share one bucket) rather than silently disabling itself.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const azure = headers.get("x-azure-clientip");
  if (azure && azure.trim()) {
    return azure.trim();
  }

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for is a comma-separated chain; the first entry is the client.
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  return "unknown";
}
