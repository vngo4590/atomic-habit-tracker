import { describe, expect, it } from "vitest";

import { createLoginThrottle, type LoginThrottleOptions } from "@/lib/security/login-throttle";

/** Tight, deterministic tuning for tests. */
const options: LoginThrottleOptions = {
  threshold: 3,
  baseLockMs: 1_000,
  maxLockMs: 8_000,
  decayMs: 60_000,
};

describe("createLoginThrottle", () => {
  it("allows attempts while failures stay at or below the threshold", () => {
    // Given a fresh throttle
    const throttle = createLoginThrottle(options);
    const now = 1_000_000;

    // When recording up to the threshold of failures
    for (let i = 0; i < options.threshold; i += 1) {
      const decision = throttle.recordFailure("user@example.com", now);
      // Then the account is not yet locked
      expect(decision.allowed).toBe(true);
    }

    expect(throttle.check("user@example.com", now).allowed).toBe(true);
  });

  it("locks the account once failures exceed the threshold", () => {
    // Given an account that has hit the threshold
    const throttle = createLoginThrottle(options);
    const now = 1_000_000;
    for (let i = 0; i < options.threshold; i += 1) {
      throttle.recordFailure("user@example.com", now);
    }

    // When one more failure occurs
    const decision = throttle.recordFailure("user@example.com", now);

    // Then the account is locked for the base window
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBe(1);
    expect(throttle.check("user@example.com", now).allowed).toBe(false);
  });

  it("applies exponential backoff capped at maxLockMs", () => {
    // Given an account already over the threshold
    const throttle = createLoginThrottle(options);
    const now = 1_000_000;
    for (let i = 0; i < options.threshold; i += 1) {
      throttle.recordFailure("user@example.com", now);
    }

    // When successive over-threshold failures occur (each after the prior unlock)
    const first = throttle.recordFailure("user@example.com", now); // 1s
    const second = throttle.recordFailure("user@example.com", now + 1_000); // 2s
    const third = throttle.recordFailure("user@example.com", now + 3_000); // 4s
    const fourth = throttle.recordFailure("user@example.com", now + 7_000); // 8s (cap)
    const fifth = throttle.recordFailure("user@example.com", now + 15_000); // still 8s cap

    // Then each lock window doubles until the max is reached
    expect(first.retryAfterSeconds).toBe(1);
    expect(second.retryAfterSeconds).toBe(2);
    expect(third.retryAfterSeconds).toBe(4);
    expect(fourth.retryAfterSeconds).toBe(8);
    expect(fifth.retryAfterSeconds).toBe(8);
  });

  it("allows attempts again once the lock window elapses", () => {
    const throttle = createLoginThrottle(options);
    const now = 1_000_000;
    for (let i = 0; i <= options.threshold; i += 1) {
      throttle.recordFailure("user@example.com", now);
    }

    // When checking after the 1s lock has passed
    expect(throttle.check("user@example.com", now + 1_000).allowed).toBe(true);
  });

  it("clears all history on a successful login", () => {
    const throttle = createLoginThrottle(options);
    const now = 1_000_000;
    for (let i = 0; i <= options.threshold; i += 1) {
      throttle.recordFailure("user@example.com", now);
    }
    expect(throttle.check("user@example.com", now).allowed).toBe(false);

    // When the user eventually logs in successfully
    throttle.recordSuccess("user@example.com");

    // Then the account is no longer tracked or locked
    expect(throttle.check("user@example.com", now).allowed).toBe(true);
    expect(throttle.size()).toBe(0);
  });

  it("forgets stale failures after the decay window", () => {
    const throttle = createLoginThrottle(options);
    const now = 1_000_000;
    // Two failures, then a long quiet period
    throttle.recordFailure("user@example.com", now);
    throttle.recordFailure("user@example.com", now);

    // When a failure occurs after the decay window, the count restarts from 1
    const later = now + options.decayMs + 1;
    const decision = throttle.recordFailure("user@example.com", later);

    // Then the account is still allowed (history was reset, not accumulated)
    expect(decision.allowed).toBe(true);
  });

  it("treats differently-cased and padded emails as the same account", () => {
    const throttle = createLoginThrottle(options);
    const now = 1_000_000;
    for (let i = 0; i <= options.threshold; i += 1) {
      throttle.recordFailure("  User@Example.com ", now);
    }

    // Then the canonical form is locked too
    expect(throttle.check("user@example.com", now).allowed).toBe(false);
  });
});
