## Context

Atomicly uses a JWT session strategy (`auth.ts`) with a **server-side revocation gate**.
The mechanism has three moving parts:

1. **`token.authTime`** — stamped once at sign-in in the `jwt` callback
   (`auth.ts:46`, `token.authTime = Date.now()`), preserved across token slides because
   `user` is only present on initial sign-in.
2. **`user.sessionsValidFrom`** — a per-user revocation cutoff (`Date | null`).
   `revokeUserSessions()` (`lib/repositories/users.ts:111`) sets it to `new Date()`.
3. **`isSessionRevoked(authTime, sessionsValidFrom)`** (`lib/auth/session-policy.ts:26`) —
   returns `true` (revoked) when `authTime < sessionsValidFrom.getTime()`. Consumed by
   `getCurrentUser()` (`lib/auth/session.ts:47`), which returns `null` for a revoked
   session. Every server action gates on `getCurrentUser()`.

### The bug

Repro: change password A→B (succeeds). Any further password-change attempt in the same
session — even with the **correct** new current password B — fails with "Not
authenticated." A **wrong** current password *also* says "Not authenticated." (before the
password is ever checked), which is misleading.

Root cause chain:

```
changePasswordAction success (lib/actions/auth.ts:229)
        │
        ▼
revokeUserSessions(user.id)  ──►  sessionsValidFrom = now  (T1)
        │
        │   current cookie still carries authTime = T0  (T0 < T1)
        ▼
next request → getCurrentUser() (session.ts:47)
        │
        ▼
isSessionRevoked(T0, T1)  ──►  T0 < T1  ──►  TRUE (revoked)
        │
        ▼
getCurrentUser() returns null
        │
        ▼
changePasswordAction guard (auth.ts:186) → "Not authenticated."
   (returns BEFORE verifyPassword runs — so a wrong password is
    also reported as "Not authenticated", not "incorrect")
```

The current device is effectively logged out server-side, but the client cookie is still
present so the UI never reflects it. The `revokeUserSessions` call is correct in intent
(invalidate stale cookies after a credential change) but wrong in blast radius: it revokes
the **initiating** device too.

## Goals / Non-Goals

**Goals:**
- Keep the **current device** authenticated across a successful password change, so a user
  can change their password repeatedly in one session.
- Continue to revoke **all other devices** after a password change (stolen/stale cookie
  protection is preserved).
- Report a wrong current password as "Current password is incorrect." (never as "Not
  authenticated.") whenever the session is still valid.
- Correct the success-message copy to reflect that only *other* devices were signed out.
- Lock the fixed behaviour with unit/integration + end-to-end regression tests.

**Non-Goals:**
- Full sign-out + redirect of the current device — **explicitly rejected** by the product
  owner.
- Re-`signIn`-with-credentials inside the action — messier, re-runs the credential
  provider, and muddies the timing-safe login path.
- Any change to `signOutEverywhereAction` — it *intentionally* revokes the current device
  and must keep doing so.
- Changing `isSessionRevoked` logic — its strict `<` comparison is exactly what makes the
  fix work and is relied upon; it stays untouched.

## Decisions

### Decision 1 — Refresh the current session's `authTime` after revoke (chosen)

After `updateUserPassword` + `revokeUserSessions`, re-issue the current session cookie with
`token.authTime = Date.now()`. Because `revokeUserSessions` set `sessionsValidFrom = T1`
first and the refresh stamps `authTime = T2` where `T2 >= T1`, the current session passes
`isSessionRevoked` (strict `<` means `authTime == sessionsValidFrom` is **not** revoked).
All other devices keep `authTime = T0 < T1` and stay revoked.

```
Before fix:                          After fix:
 device A (current): authTime T0      device A (current): authTime T2  (T2 >= T1) → VALID
 device B (other):   authTime T0      device B (other):   authTime T0  (T0 <  T1) → REVOKED
 sessionsValidFrom = T1               sessionsValidFrom = T1
 → A revoked (T0 < T1)  ✗ bug         → A survives, B revoked  ✓
```

**How the refresh is wired:**
- next-auth `^5.0.0-beta.31` exposes `unstable_update` from `NextAuth()` (confirmed:
  `node_modules/next-auth/index.d.ts:293`). Export it aliased for readability:
  `export const { handlers, auth, signIn, signOut, unstable_update: updateSession } = NextAuth({...})`.
- Extend the `jwt` callback to accept the `trigger` param. When `trigger === "update"`,
  re-stamp `token.authTime = Date.now()`. Keep the existing initial-sign-in stamp
  (`if (user?.id) { token.id = ...; token.authTime = Date.now(); }`). Both paths coexist;
  the update path is what the action invokes.
- In `changePasswordAction`, after the revoke, call `await updateSession({ ... })` (a
  minimal payload is sufficient to trigger a token re-issue and hit the `update` branch).
- **Ordering is load-bearing:** `revokeUserSessions` (sets `sessionsValidFrom = T1`) MUST
  run before the `updateSession` refresh (stamps `authTime = T2`), so that `T2 >= T1`.
  Reversing the order would leave the current device revoked.

*Why over alternatives:* smallest change, reuses the existing `authTime`/`sessionsValidFrom`
machinery, no redirect, no re-entry into the credential provider.

### Decision 2 — Do NOT full-sign-out-and-redirect (rejected)

Simpler to reason about but rejected by the product owner: it kicks the user to `/login`
immediately after they successfully changed their password, which is a poor experience and
defeats the "change it repeatedly in-session" requirement.

### Decision 3 — Do NOT re-`signIn` with credentials (rejected)

Would produce a fresh `authTime` too, but re-runs `authorizeCredentials`, re-triggers the
timing-safe bcrypt path, and risks interacting with the login throttle. `unstable_update`
is the purpose-built primitive for mutating an existing session.

### Decision 4 — Fix the misleading "Not authenticated." on wrong password

This is not a separate code path — it is a *consequence* of the bug. Once the current
session survives (Decision 1), `getCurrentUser()` returns the user, so a wrong current
password flows to the existing `verifyPassword` check and correctly returns "Current
password is incorrect." (`lib/actions/auth.ts:201`). No new code needed; it is covered by a
regression test to prevent recurrence.

### Decision 5 — Correct success-message copy

Change the success string from "Password changed. Please sign in again on your devices." to
copy that reflects reality — the current device stays signed in and only *other* devices
were signed out (e.g. "Password changed. You've been signed out on your other devices.").
This is the requirement delta against `change-password-form`.

## Risks / Trade-offs

- **`unstable_update` is a beta API** → It is the documented session-update primitive for
  next-auth v5 and is already a hard dependency of the app's auth stack. Pin behaviour with
  tests; if a future upgrade renames/stabilises it, the alias `updateSession` localises the
  change to `auth.ts`.
- **Security: current device intentionally survives a self-service password change** →
  This is standard industry practice (you don't log yourself out when you change your own
  password). Stolen/stale cookies on *other* devices are still invalidated by the unchanged
  `revokeUserSessions` + gate. Documented as an accepted, narrowed trade-off, not a
  regression of the "sign out everywhere" control.
- **Ordering bug risk (refresh before revoke)** → Would silently re-break the current
  device. Mitigated by (a) an explicit code comment on ordering and (b) a unit test that
  asserts the current session survives *and* revoke was called.
- **Strict-vs-non-strict comparison drift** → The fix depends on `isSessionRevoked` using
  strict `<` (so `authTime == sessionsValidFrom` is valid). A future change to `<=` would
  re-break the equal-timestamp edge. Mitigated by an explicit `isSessionRevoked` boundary
  test at `authTime == sessionsValidFrom`.
- **E2E flakiness from rate limiting** → Changing the password 5+ times in a loop can trip
  the per-account login throttle (`lib/security/login-throttle.ts`) and the API rate
  limiter (`proxy.ts`). Mitigated by running the E2E spec with `RATE_LIMIT_DISABLED=true`
  and (on Windows) the prod server via `npx next start -p 3000` with `BASE_URL` set.

## Migration Plan

Pure code change — no data model or DB migration (`sessionsValidFrom` already exists). No
backfill. Rollback is a straight revert of the `auth.ts` + `lib/actions/auth.ts` changes;
sessions issued under the fix remain valid after rollback (they just carry a refreshed
`authTime`). No env-var changes for production (`RATE_LIMIT_DISABLED` is test-only).

## Open Questions

- Exact success-copy wording is a product-owner call; the delta spec fixes the *meaning*
  ("current device stays in, other devices signed out"), not the literal string.
