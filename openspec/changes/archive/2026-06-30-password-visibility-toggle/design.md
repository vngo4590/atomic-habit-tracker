## Context

Atomicly's password fields are plain `<input type="password">` with no reveal affordance,
across three locations:

- `components/AuthForm.tsx` (lines ~89–102) — the single password field shared by `/login`
  and `/register`. Validation flows through React 19 `useActionState`.
- `app/(root)/settings/page.tsx` (lines ~314–333) — the "Current password" and "New password"
  fields inside the change-password form.

The Settings page is also carrying a **reopen bug**. Its change-password form uses
`useActionState` at the page-component level (`[passwordState, passwordAction, passwordPending]`,
~line 83). After the first success, `passwordState.ok` is `true` and is never reset. The render
keys off `passwordSuccess = passwordState.ok` (~line 112), so when `changingPassword` is toggled
back on, the success branch (~line 308) renders instead of the form. The "Done" button (~line 348)
only sets local `changingPassword` to `false`; it never resets the action state. Result: a user
can change their password exactly once per page load.

Repo conventions that constrain this design:
- Icons are centralised in `components/Icons.tsx` as thin wrappers over `lucide-react`
  (defaults `strokeWidth: 1.5`, `size: 14`). The eye icons should follow that pattern, not be
  hand-rolled SVGs.
- CSS Modules + global partials; **no inline `style={{}}` for static layout/colour**
  (`atomic-habit-css-conventions`). The toggle's positioning must live in a CSS module.
- SOLID/GRASP and file-size signals (`atomic-habit-design-principles`): the settings page is
  already large, so extracting the change-password form is a desirable side effect.

## Goals / Non-Goals

**Goals:**
- One reusable `PasswordInput` primitive owning the show/hide toggle, consumed by all three
  fields (DRY / Single Responsibility).
- Keyboard-accessible, non-submitting (`type="button"`) toggle with a flipping `aria-label`.
- Fix the change-password reopen bug so reopening always yields a fresh empty form.
- Keep `changePasswordAction` and all server/API behaviour unchanged.

**Non-Goals:**
- No change to password validation rules, strength meters, or `autoComplete` semantics beyond
  forwarding existing attributes.
- No redesign of the Settings page beyond extracting the change-password form.
- No new runtime dependency (`lucide-react` already present).
- No change to Turnstile, auth server actions, or the session/profile flows.

## Decisions

### Decision 1: Introduce `components/PasswordInput.tsx` as the single primitive

A client component that renders the `<input>` plus an absolutely-positioned eye toggle button
inside a relatively-positioned wrapper. It owns one piece of state: `visible: boolean`. It
forwards all standard input props (`name`, `autoComplete`, `required`, `minLength`,
`className`, `id`, etc.) so it is a drop-in replacement.

- **Why**: Three call sites need identical behaviour; centralising satisfies DRY and gives a
  single place to test accessibility. (GRASP: Information Expert + Pure Fabrication.)
- **Props shape**: extend `React.ComponentPropsWithoutRef<"input">` and omit/override `type`
  (the component controls `type` via internal state). Accept the existing `className` so the
  caller can keep passing `input` / `styles.smallInput` classes onto the field.
- **Toggle button**: `type="button"`, `aria-label` = `visible ? "Hide password" : "Show
  password"`, renders `IconEye` / `IconEyeOff`. `onClick` flips local state only.
- **Alternatives considered**:
  - *Duplicate toggle JSX in each form* — rejected: triple maintenance, triple test surface.
  - *A hook (`usePasswordVisibility`) + bare markup per site* — rejected: still duplicates the
    button markup and CSS; a component encapsulates both behaviour and presentation.

### Decision 2: Eye icons via `components/Icons.tsx`

Add `IconEye` (lucide `Eye`) and `IconEyeOff` (lucide `EyeOff`) wrappers next to the existing
icon exports, inheriting `iconDefaults`.

- **Why**: Matches the established icon convention; avoids hand-rolled inline SVGs and keeps
  stroke/size consistent with the rest of the UI.
- **Alternative**: inline SVG in `PasswordInput` — rejected for inconsistency with the repo.

### Decision 3: Toggle positioning via a colocated CSS module

Add `components/PasswordInput.module.css` with a wrapper (`position: relative`) and a toggle
button (`position: absolute`, vertically centred, right-aligned) plus right padding on the
field so text doesn't run under the icon.

- **Why**: Inline static styles are disallowed by `atomic-habit-css-conventions`.
- **Note**: the field keeps the caller-supplied `input` class for shared field styling; the
  module only adds positioning/affordance.

### Decision 4: Fix the reopen bug by extracting `ChangePasswordForm.tsx` that owns its own `useActionState`

Create `app/(root)/settings/ChangePasswordForm.tsx`, a client component containing the
change-password `useActionState`, the form, the success row, and the two `PasswordInput`
fields. The Settings page renders it only when `changingPassword` is true, and the component is
**unmounted** when the panel closes. Remounting on reopen gives a fresh `{ ok: false }` state,
so the success branch can never leak into a later open.

- **Why this over alternatives**:
  - *Reset state via a `key` prop that changes each open* — works, but still leaves the action
    state and form markup bloating the page; extraction also addresses the file-size signal.
  - *Manually reset state in the "Done"/close handler* — `useActionState` has no public reset;
    would require a sentinel action dispatch or `startTransition` hack — fragile and unclear.
  - *Lift a `resetKey`* — partial fix; doesn't reduce page size or improve cohesion.
  Extraction fixes the bug structurally (fresh mount = fresh state) **and** improves cohesion,
  so it is preferred. The page passes a callback (e.g. `onDone`) so the child can close the
  panel and trigger the existing success toast.
- **Behaviour parity**: the extracted component must preserve the current submit logging
  (`clientLogger.info("Password change submitted", ...)`), the "Changing..." pending label,
  the success row, the "Done" button closing the panel + showing the "Password changed" toast,
  and the inline `passwordState.message` error display.

## Risks / Trade-offs

- **Revealed password shoulder-surfing** → Default state is always concealed; revealing is an
  explicit, per-field user action that resets on remount. Acceptable and industry-standard.
- **Password managers / autofill regressions from wrapping the input** → Forward `name`,
  `autoComplete`, and other attributes unchanged so autofill keeps working; covered by keeping
  `PasswordInput` a thin wrapper over a real `<input>`.
- **Behaviour drift during settings extraction** → Mitigate by porting the existing JSX/handlers
  verbatim into `ChangePasswordForm.tsx` and adding a settings test for reopen-after-success
  plus keeping existing settings tests green.
- **Toggle overlapping field text on narrow widths** → CSS module adds right padding sized to
  the icon; verify in existing UI-state visual tests.
- **`type="text"` reveal interfering with form submission of the password value** → The field's
  `name` is unchanged regardless of `type`, so the submitted value is identical; only masking
  changes.

## Migration Plan

No data or API migration. Pure front-end change. Rollback is reverting the branch; there is no
persisted state involved. Ship behind the existing branch `feat/password-visibility-toggle`.

## Open Questions

- Exact icon glyphs: `Eye`/`EyeOff` (recommended) — confirm during implementation that both are
  exported by the installed `lucide-react` version (they are part of its standard set).
- Whether `PasswordInput` should also expose an `id`/label association helper — current call
  sites wrap the input in a `<label>`, so no `htmlFor` wiring is required; keep it minimal.
