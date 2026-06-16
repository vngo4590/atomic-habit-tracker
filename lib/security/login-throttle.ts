/**
 * Per-account login throttle with exponential backoff.
 *
 * WHAT: Tracks consecutive failed password attempts for a given account (keyed
 * by email) and imposes a growing lock window once a threshold is crossed. WHY:
 * The IP-based rate limiter (`rate-limit.ts`) slows a single noisy source, but a
 * distributed/rotating-IP attack can still hammer one account. This throttle
 * adds an account-scoped brake that those attacks cannot dodge by changing IP.
 *
 * Design choices:
 *   • We record a failure ONLY for real, existing accounts with a wrong password
 *     (the caller decides). Unknown emails never increment, so an attacker cannot
 *     enumerate accounts via lock state, and the DoS surface is limited to emails
 *     they already know belong to a real user.
 *   • We use progressive backoff (not a long hard lock) to keep the
 *     lock-out-the-victim DoS impact small and self-healing.
 *   • State is in-memory, consistent with `rate-limit.ts`: correct on a single
 *     instance, a backstop (not the sole control) behind Turnstile + WAF. Move to
 *     a shared store if we ever scale out.
 */

/** Tunables for the throttle. Exposed so tests can use tight numbers. */
export interface LoginThrottleOptions {
  /** Failures allowed before backoff kicks in. */
  threshold: number;
  /** Base lock window (ms) applied at the first over-threshold failure. */
  baseLockMs: number;
  /** Maximum lock window (ms) the exponential backoff is capped at. */
  maxLockMs: number;
  /** Idle time (ms) after which a quiet account's failure history is forgotten. */
  decayMs: number;
  /** Safety cap on tracked accounts to bound memory. */
  maxKeys?: number;
}

/** The verdict for a login gate check. */
export interface LoginThrottleDecision {
  /** True when a login attempt for this account may proceed. */
  allowed: boolean;
  /** Seconds to wait before retrying (0 when allowed). */
  retryAfterSeconds: number;
}

interface AttemptRecord {
  /** Consecutive failures recorded. */
  failures: number;
  /** Epoch-ms the account is locked until (0 when not locked). */
  lockedUntil: number;
  /** Epoch-ms of the last recorded activity, for decay. */
  lastSeen: number;
}

/** Sensible production defaults: 5 strikes, then 30s → 1m → 2m … capped 15m. */
export const DEFAULT_LOGIN_THROTTLE: LoginThrottleOptions = {
  threshold: 5,
  baseLockMs: 30_000,
  maxLockMs: 15 * 60_000,
  decayMs: 30 * 60_000,
  maxKeys: 50_000,
};

/** A login throttle instance with its own isolated store. */
export interface LoginThrottle {
  /** Returns whether a login for `key` may proceed right now. */
  check: (key: string, now?: number) => LoginThrottleDecision;
  /** Records a failed attempt and returns the resulting decision. */
  recordFailure: (key: string, now?: number) => LoginThrottleDecision;
  /** Clears history after a successful login. */
  recordSuccess: (key: string) => void;
  /** Number of accounts currently tracked — for tests/diagnostics. */
  size: () => number;
}

/** Normalise the key so "User@Example.com " and "user@example.com" collide. */
function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

/**
 * Creates an independent login throttle. The auth layer uses one shared
 * instance; tests can create their own with tight timings.
 */
export function createLoginThrottle(
  options: LoginThrottleOptions = DEFAULT_LOGIN_THROTTLE,
): LoginThrottle {
  const { threshold, baseLockMs, maxLockMs, decayMs } = options;
  const maxKeys = options.maxKeys ?? 50_000;
  const store = new Map<string, AttemptRecord>();

  function pruneExpired(now: number): void {
    for (const [key, record] of store) {
      if (record.lockedUntil <= now && now - record.lastSeen >= decayMs) {
        store.delete(key);
      }
    }
  }

  function lockWindowFor(failures: number): number {
    // First over-threshold failure → baseLockMs, doubling each subsequent one.
    const overage = failures - threshold;
    const window = baseLockMs * 2 ** Math.max(0, overage - 1);
    return Math.min(window, maxLockMs);
  }

  function check(key: string, now: number = Date.now()): LoginThrottleDecision {
    const record = store.get(normalizeKey(key));
    if (!record || record.lockedUntil <= now) {
      return { allowed: true, retryAfterSeconds: 0 };
    }
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((record.lockedUntil - now) / 1000)),
    };
  }

  function recordFailure(key: string, now: number = Date.now()): LoginThrottleDecision {
    const normalized = normalizeKey(key);
    let record = store.get(normalized);

    // Forget stale history so a user who failed long ago starts fresh.
    if (record && now - record.lastSeen >= decayMs) {
      record = undefined;
    }

    if (!record) {
      if (store.size >= maxKeys) {
        pruneExpired(now);
      }
      record = { failures: 0, lockedUntil: 0, lastSeen: now };
      store.set(normalized, record);
    }

    record.failures += 1;
    record.lastSeen = now;

    if (record.failures > threshold) {
      record.lockedUntil = now + lockWindowFor(record.failures);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((record.lockedUntil - now) / 1000)),
      };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  function recordSuccess(key: string): void {
    store.delete(normalizeKey(key));
  }

  return { check, recordFailure, recordSuccess, size: () => store.size };
}

/**
 * Shared process-wide throttle used by the credentials authorizer. Module-level
 * so all login attempts in this instance share one view of an account's history.
 */
export const loginThrottle = createLoginThrottle();
