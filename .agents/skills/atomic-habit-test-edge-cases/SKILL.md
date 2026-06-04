---
name: atomic-habit-test-edge-cases
description: Edge-case checklist for Atomicly tests across inputs, dates, auth, repositories, Zod contracts, the optimistic store, and API/UI responses. Use before marking any test suite complete to verify breadth of coverage and to systematically discover missing scenarios at every tier.
---

# Atomicly Test Edge Cases

> **TL;DR:** Walk this checklist before declaring a suite complete. Every applicable item must have at least one test.

This skill is the source of truth for the **scenarios every test suite must consider**. Pair with `atomic-habit-test-quality-standard` (the assertion bar) and `atomic-habit-test-tier-policy` (which tier).

## Input boundaries
- [ ] Empty string, empty array, null, undefined where the type allows
- [ ] Minimum valid value and maximum valid value
- [ ] Strings with leading/trailing whitespace
- [ ] Unicode and non-ASCII characters in text fields

## Date and time
- [ ] Today's date key vs. yesterday vs. a future date
- [ ] UTC/local mismatch — use `lib/date-keys.ts` helpers, not raw `new Date().toISOString()`
- [ ] Habit created on the same day as the check-in
- [ ] Streak spanning month/year boundaries
- [ ] Week start on Sunday vs. Monday depending on `weekStartKey` logic
- [ ] Unscheduled days in the gap (see `atomic-habit-schedule-metrics`)

## Auth and session
- [ ] Unauthenticated call (missing session) → redirect or 401
- [ ] Expired session → redirect to `/login`
- [ ] Mismatched user ID (user tries to mutate another user's record) → rejection
- [ ] Deleted user record still in JWT → redirect

## Repository / DB boundary
- [ ] Record not found → graceful null or empty array, not thrown exception
- [ ] Duplicate key conflict (creating a habit that already exists)
- [ ] Concurrent writes — does the action safely upsert?
- [ ] Stack-link cycle / exclusivity / self-reference (see `atomic-habit-habit-stacking`)

## Zod contracts
- [ ] Missing required field
- [ ] Field exceeding max length
- [ ] Invalid enum value
- [ ] Coerced types (number as string)

## Store and optimistic cache
- [ ] Store reflects optimistic state before server action resolves
- [ ] Store reverts or stays consistent if the action rejects
- [ ] Computed values (`streak`, `completionRate`, `longestStreak`) at zero, one, and many check-ins

## UI and API responses
- [ ] `{ ok: true, data }` shape for success
- [ ] `{ ok: false, error }` shape with correct HTTP status for every error branch
- [ ] Missing required headers (e.g., Authorization missing on API v1 routes)

## See Also

- `atomic-habit-test-quality-standard` — assertion quality rules
- `atomic-habit-test-tier-policy` — which tier to cover a case at
- `atomic-habit-test-mocking-patterns` — how to set the case up safely
