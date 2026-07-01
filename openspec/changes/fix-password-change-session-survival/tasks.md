# Tasks — fix-password-change-session-survival

> Branch: `feat/password-visibility-toggle` (already checked out).
> Validation gate for the whole change (run before push):
> `npm exec vitest run && npm run typecheck && npm run lint:app && npm run build`

## 1. Wire the session-refresh primitive (`auth.ts`)

- [x] 1.1 Export next-auth's `unstable_update` from `NextAuth()` in `auth.ts`, aliased as
      `updateSession` (`export const { handlers, auth, signIn, signOut, unstable_update: updateSession } = NextAuth({...})`).
      Verify: `npm run typecheck` passes and `updateSession` is importable.
- [x] 1.2 In the `auth.ts` `jwt` callback, accept the `trigger` parameter and, when
      `trigger === "update"`, re-stamp `token.authTime = Date.now()`. Keep the existing
      initial-sign-in stamp (`if (user?.id) { ...; token.authTime = Date.now(); }`) and the
      cross-slide preservation intact. Add a comment explaining why the update path exists.
      Verify: covered by task 3.4.

## 2. Fix `changePasswordAction` (`lib/actions/auth.ts`)

- [x] 2.1 After `updateUserPassword` + `revokeUserSessions`, call `await updateSession(...)`
      to re-issue the current cookie with a fresh `authTime`. **Ordering is load-bearing:**
      the refresh MUST run AFTER `revokeUserSessions` so `authTime >= sessionsValidFrom`.
      Add an inline comment documenting the ordering requirement.
- [x] 2.2 Update the success message so it accurately states the current device stays
      signed in and only *other* devices were signed out (replace "Password changed. Please
      sign in again on your devices."). Verify against the `change-password-form`
      MODIFIED requirement.
- [x] 2.3 Confirm no change is needed to `lib/auth/session-policy.ts` (strict `<` is relied
      upon) or `lib/repositories/users.ts`. Note it in the PR description.

## 3. Unit / integration tests — `lib/auth/__tests__/`

- [x] 3.1 `isSessionRevoked` boundary tests: `authTime == sessionsValidFrom` → NOT revoked
      (guards the strict `<`); `authTime` just after cutoff → NOT revoked; `authTime` before
      cutoff → revoked; null/undefined `authTime` with a set cutoff → revoked (fail closed);
      null/undefined `sessionsValidFrom` → NOT revoked (fail open). Add to / extend
      `session-policy.test.ts`. Verify: `npm exec vitest run lib/auth/__tests__/session-policy.test.ts`.
- [x] 3.2 `jwt` callback `trigger === "update"` re-stamps `authTime` to now.
- [x] 3.3 `jwt` callback on initial sign-in (user present) still stamps `authTime`.
- [x] 3.4 `jwt` callback ordinary slide (no user, no update trigger) preserves the existing
      `authTime` unchanged. (3.2–3.4 in a focused `auth.jwt` test; verify with
      `npm exec vitest run lib/auth`.)

## 4. Unit / integration tests — `lib/actions/__tests__/`

> Mock Prisma and mock the session update (`updateSession`) — no DB/network.

- [x] 4.1 `changePasswordAction` success path asserts BOTH: `revokeUserSessions` was called
      AND the session refresh (`updateSession` / `authTime` re-stamp) was invoked (i.e. the
      current device is refreshed, not just revoked).
- [x] 4.2 Regression — after a first successful change, a SECOND `changePasswordAction`
      call in the same session still authenticates (the current user resolves) and succeeds
      with the correct new current password. This is the exact reported bug.
- [x] 4.3 Wrong current password (with a still-valid session) returns "Current password is
      incorrect." and NOT "Not authenticated." — asserts the misleading message is gone.
- [x] 4.4 New-password validation branches still return their specific messages: too short
      (< 8), missing letter, missing number, missing symbol, too long (> 128).
- [x] 4.5 Verify tiers 3–4: `npm exec vitest run lib/actions lib/auth`.

## 5. End-to-end test — `e2e/` (Playwright, tier-3)

> **Prerequisites (flag for the implementer):** requires Playwright + a running DB-backed
> app. Run with `RATE_LIMIT_DISABLED=true` (otherwise the login throttle in
> `lib/security/login-throttle.ts` and the API rate limiter in `proxy.ts` trip during a 5x
> change loop). On Windows, run the prod server via `npx next start -p 3000` with `BASE_URL`
> set (per the repo e2e convention in `playwright.config.ts`).

- [ ] 5.1 New spec (e.g. `e2e/password-change.spec.ts`): log in, then change the password
      AT LEAST 5 TIMES in a row in one session (chaining old→new each time), asserting each
      change succeeds AND the user stays authenticated (never bounced to `/login`).
- [ ] 5.2 Edge case: wrong current password shows "Current password is incorrect." and the
      form stays usable (not signed out).
- [ ] 5.3 Edge case (the reported bug): after a wrong attempt, a subsequent CORRECT change
      still works.
- [ ] 5.4 Edge case: a new password failing a validation rule shows the specific message.
- [ ] 5.5 Edge case: reopening the panel after a successful change shows a fresh, empty form
      (guards the earlier `change-password-form` reset fix).
- [ ] 5.6 Verify: `RATE_LIMIT_DISABLED=true` with the prod server running, then
      `npx playwright test e2e/password-change.spec.ts` (green).

## 6. Docs & validation

- [x] 6.1 If auth/session behaviour docs exist, note the narrowed revocation behaviour
      (current device survives self-service password change) in
      `docs/architecture/security.md` residual-risk / auth section.
- [x] 6.2 Run the full gate: `npm exec vitest run && npm run typecheck && npm run lint:app && npm run build` — all green.
- [ ] 6.3 Commit in small Conventional Commits (e.g. `fix(auth): keep current device signed in on password change`, `test(auth): cover repeated in-session password changes`) with the `Co-authored-by: Copilot` trailer, then push the branch.

