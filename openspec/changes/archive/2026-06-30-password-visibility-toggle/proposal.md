## Why

Users typing passwords in Atomicly have no way to reveal what they typed, which causes
avoidable login/registration failures and friction when setting a new password. Separately,
the Settings change-password form has a bug: it works once, then refuses to reopen — after a
successful change the form is permanently replaced by the "Password changed." success row, so
a user can never change their password a second time in the same session.

## What Changes

- Add a password-visibility toggle (an "eye" icon button) inside password inputs that flips
  the field between hidden (`type="password"`) and revealed (`type="text"`). The toggle is a
  non-submitting button (`type="button"`), keyboard-accessible, and exposes an `aria-label`
  that flips between "Show password" and "Hide password".
- Introduce a single reusable `PasswordInput` primitive so the toggle behaviour is implemented
  once and shared, rather than duplicated across the three password fields.
- Apply the toggle to the `AuthForm` password field (used by both `/login` and `/register`).
- Apply an independent toggle to **each** of the two Settings change-password fields
  ("Current password" and "New password"), so each can be revealed separately.
- Fix the Settings change-password reopen bug so that reopening the change-password panel
  after a successful change always shows a fresh, empty form instead of the stale success row.

## Capabilities

### New Capabilities
- `password-input`: A reusable password input field with a built-in show/hide visibility
  toggle, covering the accessibility, non-submit, and reveal/conceal behaviour shared by the
  auth forms and the settings change-password form.
- `change-password-form`: The Settings change-password flow, covering submission, the success
  state, and the requirement that reopening the panel after a success presents a fresh empty
  form (the bug fixed by this change).

### Modified Capabilities
<!-- None — there are no existing specs under openspec/specs/, so both areas are introduced as new capabilities. -->

## Impact

- **Components**: new `components/PasswordInput.tsx` (+ colocated CSS module); modified
  `components/AuthForm.tsx`; new `components/Icons.tsx` exports for the eye icons (lucide-react
  `Eye` / `EyeOff`).
- **Pages**: `app/(root)/settings/page.tsx` — change-password form extracted into a new
  `app/(root)/settings/ChangePasswordForm.tsx` client component that owns its own
  `useActionState` (fixes the reopen bug and trims the oversized page).
- **Tests**: new `components/__tests__/PasswordInput.test.tsx`; updated auth tests
  (`app/(auth)/login/__tests__/page.test.tsx`, `app/(auth)/register/__tests__/page.test.tsx`);
  new/updated settings tests covering reopen-after-success.
- **Dependencies**: none new — `lucide-react` is already a dependency.
- **No API, data-model, or server-action changes** — `changePasswordAction` is unchanged.
