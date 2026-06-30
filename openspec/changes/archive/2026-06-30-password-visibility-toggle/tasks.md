# Implementation Tasks

Branch: `feat/password-visibility-toggle`. Follow `atomic-habit-workflow` — small commits,
comment for non-coders, a test for every change. Validation gate before push:
`npm exec vitest run`, `npm run typecheck`, `npm run lint:app`, `npm run build`.

## 1. Eye icons

- [x] 1.1 Add `IconEye` (lucide `Eye`) and `IconEyeOff` (lucide `EyeOff`) wrappers to
  `components/Icons.tsx`, inheriting the existing `iconDefaults` (strokeWidth 1.5, size 14).
  Verify: both exports compile and render an SVG.

## 2. Reusable PasswordInput primitive

- [x] 2.1 Create `components/PasswordInput.module.css` with a `position: relative` wrapper, an
  absolutely-positioned, vertically-centred toggle button on the right, and right padding on
  the field so typed text doesn't run under the icon. Comment each token's visual purpose. No
  inline static styles anywhere. Verify: classes exist and match `atomic-habit-css-conventions`.
- [x] 2.2 Create `components/PasswordInput.tsx` (client component) that extends
  `React.ComponentPropsWithoutRef<"input">` (omitting/overriding `type`), forwards all standard
  field props (`name`, `autoComplete`, `required`, `minLength`, `className`, `id`, ...), owns a
  single `visible` state, and renders an inline toggle `<button type="button">` with
  `aria-label` = `visible ? "Hide password" : "Show password"` showing `IconEyeOff`/`IconEye`.
  The button's `onClick` flips only local state. Add top-of-file JSDoc explaining what it is and
  why. Verify: `npm run typecheck` passes and the component type-checks as a drop-in for an
  `<input type="password">`.

## 3. Wire PasswordInput into AuthForm

- [x] 3.1 Replace the password `<input>` in `components/AuthForm.tsx` (lines ~89–102) with
  `PasswordInput`, preserving `className="input"`, `name="password"`, the conditional
  `autoComplete` (`new-password` vs `current-password`), `required`, and `minLength={8}`, and
  keep the existing field-error rendering beneath it. Verify: `/login` and `/register` still
  render and submit unchanged.

## 4. Fix the change-password reopen bug (extract ChangePasswordForm)

- [x] 4.1 Create `app/(root)/settings/ChangePasswordForm.tsx` (client component) that owns its
  own `useActionState(changePasswordAction, { ok: false, message: "" })`, renders the form, the
  success row, and an `onDone` callback prop for closing the panel + firing the existing
  "Password changed" toast. Port the existing submit logging, "Changing..." pending label, and
  inline `passwordState.message` error display verbatim. Verify: component type-checks.
- [x] 4.2 Use `PasswordInput` for BOTH fields in `ChangePasswordForm.tsx` — "Current password"
  (`name="currentPassword"`) and "New password" (`name="newPassword"`) — each with its own
  independent toggle, preserving `className`/`smallInput`, `required`, and `minLength={8}`.
- [x] 4.3 In `app/(root)/settings/page.tsx`, remove the page-level change-password
  `useActionState`, the `passwordSuccess` derivation, and the inlined form/success-row markup;
  render `<ChangePasswordForm onDone={...} />` only when `changingPassword` is true so it
  unmounts on close (fresh `{ ok: false }` state on reopen). Verify: closing and reopening the
  panel shows a fresh empty form, not the stale success row.
- [x] 4.4 Confirm the settings page no longer references the removed state/vars and that the
  "Done"/close path still shows the success toast and closes the panel. Verify: `npm run lint:app`
  and `npm run typecheck` pass with no unused symbols.

## 5. Tests

- [x] 5.1 Add `components/__tests__/PasswordInput.test.tsx` covering: default type is `password`
  with `aria-label` "Show password"; activating the toggle flips to `type="text"` and label
  "Hide password"; activating again flips back; the toggle is `type="button"` and does not submit
  a surrounding `<form>` (assert an `onSubmit` spy is NOT called on toggle click); two instances
  toggle independently. Verify: `npm exec vitest run components/__tests__/PasswordInput.test.tsx`.
- [x] 5.2 Update `app/(auth)/login/__tests__/page.test.tsx` and
  `app/(auth)/register/__tests__/page.test.tsx` so they still pass with `PasswordInput` and add
  an assertion that the show/hide toggle is present and accessible by `aria-label`.
- [x] 5.3 Add/update a settings test covering the reopen-after-success flow: simulate a
  successful change, click "Done"/close, reopen the panel, and assert an empty change-password
  form is shown again and the "Password changed." success row is NOT present. Verify with
  `npm exec vitest run` against the settings test file.

## 6. Validation & docs

- [x] 6.1 Run the full gate: `npm exec vitest run`, `npm run typecheck`, `npm run lint:app`,
  `npm run build` — all green.
- [x] 6.2 Update `README.md` / `AGENTS.md` if the new `PasswordInput` component or the settings
  `ChangePasswordForm` extraction warrants a note (component inventory / UI behaviour). Verify:
  docs mention the reusable password input where component conventions are described.
