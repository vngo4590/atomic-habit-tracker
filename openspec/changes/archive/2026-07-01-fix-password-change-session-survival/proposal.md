## Why

Changing your password once in a session silently signs you out of the very device you
changed it on. After a first successful change, every subsequent action — including a
second password change with the *correct* new current password — fails with a misleading
"Not authenticated." message, even though the UI still looks logged in. This is a
security-sensitive auth-flow bug: the revoke-on-password-change control is too broad and
takes down the initiating session, degrading a core account-security action into a trap.

## What Changes

- **Fix the over-broad session revocation on password change.** After a successful
  `changePasswordAction`, keep the **current device** signed in while still revoking
  **all other devices**. Concretely: refresh the current session's `authTime` to "now" so
  it is `>=` the newly-advanced `sessionsValidFrom` revocation cutoff and therefore is
  **not** rejected by the server-side gate, while every other device (whose `authTime`
  predates the cutoff) stays revoked.
- **Export next-auth's `unstable_update`** from `auth.ts` (aliased as `updateSession`) and
  handle the `update` trigger in the `jwt` callback to re-stamp `token.authTime` to
  `Date.now()`. The existing initial-sign-in stamp and cross-slide preservation are kept.
- **Re-issue the current cookie after revoke** inside `changePasswordAction`, ordered so
  the `authTime` refresh happens *after* `revokeUserSessions` sets the cutoff.
- **Correct the success message** so it accurately says other devices were signed out,
  instead of implying the current device must sign in again.
- **Dramatically expand password-change test coverage** across unit/integration (Vitest)
  and end-to-end (Playwright) tiers, directly encoding the reported regression: repeated
  in-session password changes must succeed and never bounce the user to `/login`.

Non-goals: full sign-out + redirect of the current device (explicitly rejected by the
product owner); re-`signIn`-with-credentials workarounds; any change to the "sign out of
all devices" account-security flow (`signOutEverywhereAction`), which intentionally still
revokes the current device.

## Capabilities

### New Capabilities
- `password-change-session`: The server-side session lifecycle around a self-service
  password change — the current device survives the change and can change the password
  repeatedly in-session, all other devices are revoked, wrong current password is reported
  as such (never as "Not authenticated"), and the `authTime` / `sessionsValidFrom`
  revocation semantics (strict `<`, null handling, `update`-trigger re-stamp) that make
  this correct.

### Modified Capabilities
- `change-password-form`: The success confirmation requirement's wording changes to reflect
  that only *other* devices are signed out (the current device stays authenticated), rather
  than telling the user to sign in again everywhere.

## Impact

- **Code:** `auth.ts` (export `unstable_update`; `jwt` callback `trigger` handling),
  `lib/actions/auth.ts` (`changePasswordAction` re-issues the current session after revoke;
  success message copy). No change to `lib/auth/session-policy.ts` logic (its strict `<`
  is relied upon) or `lib/repositories/users.ts`.
- **Dependency behaviour:** relies on `next-auth@^5.0.0-beta.31`'s `unstable_update`
  (confirmed present in `node_modules/next-auth/index.d.ts:293`) — a beta API, noted as a
  tracked risk in design.
- **Security:** narrows a defence-in-depth control. The current device intentionally
  survives a self-service password change (standard practice); stolen/stale cookies on
  other devices are still invalidated. No change to CSP, rate limiting, Turnstile, or the
  timing-safe credential path.
- **Tests:** new/expanded Vitest specs under `lib/actions/__tests__/` and
  `lib/auth/__tests__/`; a new Playwright spec under `e2e/` (requires Playwright + a
  running DB-backed app, `RATE_LIMIT_DISABLED=true`).
