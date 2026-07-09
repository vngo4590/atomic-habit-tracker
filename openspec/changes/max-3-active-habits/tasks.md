# Implementation Tasks

Branch: `feat/max-3-active-habits`. Follow `atomic-habit-workflow` — small Conventional Commits
(with the `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer),
comment for non-coders, a test for every change, CSS Modules (no inline static styles),
SOLID + GRASP. Validation gate before push: `npm exec vitest run`, `npm run typecheck`,
`npm run lint:app`, `npm run build`.

## 1. Shared cap predicate

- [x] 1.1 Create `lib/habit-cap.ts` exporting `MAX_ACTIVE_HABITS = 3`, a pure
  `isInductedHabit(habitId, verdicts)` (true iff a verdict for that habit has `formed === true`),
  and a pure `activeHabitCount(habits, verdicts)` that counts habits not inducted (the store's
  `habits` already exclude archived rows). Add top-of-file JSDoc explaining the "active" rule and
  why induction frees a slot. Verify: `npm run typecheck` passes.
- [x] 1.2 Add `lib/__tests__/habit-cap.test.ts` covering: no verdicts → all active; one `formed`
  verdict → that habit excluded; a `keep_practicing` verdict → still counted; unknown habitId
  verdict ignored. Verify: `npm exec vitest run lib/__tests__/habit-cap.test.ts`.

## 2. Server enforcement (repository)

- [x] 2.1 In `lib/repositories/habits.ts`, add async `countActiveHabits(userId, db)` counting
  `db.habit.count({ where: { userId, archivedAt: null, verdicts: { none: { decision: "formed" } } } })`,
  with a comment explaining the predicate. Export a `CreateHabitResult =
  { ok: true; habit: Habit } | { ok: false; reason: "cap" }` type.
- [x] 2.2 Change `createHabit` to return `Promise<CreateHabitResult>`: count active habits first
  and return `{ ok: false, reason: "cap" }` (no write) when `>= MAX_ACTIVE_HABITS`, otherwise
  create and return `{ ok: true, habit }`. Comment why a discriminated union (not a throw) is used
  (Next.js strips server-action error messages in prod). Verify: `npm run typecheck`.
- [x] 2.3 Add `lib/repositories/__tests__/habits-cap.test.ts` with a mock Prisma client covering:
  under cap → creates and returns `{ ok:true }`; at cap → `{ ok:false, reason:"cap" }` and
  `db.habit.create` NOT called; the `count` where-clause excludes formed verdicts and archived.
  Verify with vitest.

## 3. Server action + API route

- [x] 3.1 Update `createHabitAction` in `lib/actions/domain.ts` to return `CreateHabitResult`
  (pass through the repository result; still revalidate on success). Verify: `npm run typecheck`.
- [x] 3.2 Update `app/api/v1/habits/route.ts` POST to inspect the result and return HTTP 409 when
  `reason === "cap"` (otherwise 201 with the habit). Verify: route type-checks.
- [x] 3.3 Update affected existing tests to the new result shape:
  `lib/actions/__tests__/domain.test.ts` (expect `{ ok: true, habit }`),
  `lib/actions/__tests__/domain-defaults.test.ts` (mock `createHabit` → `{ ok: true, habit }`),
  `lib/repositories/__tests__/ownership.test.ts` (add a `db.habit.count` mock returning 0), and
  add API 409 coverage in `app/api/v1/__tests__/routes.test.ts`. Verify with vitest.

## 4. Store rollback

- [x] 4.1 In `lib/store.ts` `addHabit`, handle the `CreateHabitResult`: on `{ ok:false, reason }`
  remove the optimistic `pending-…` row and `showToast("Couldn't create habit", <cap message>)`;
  on `{ ok:true }` swap the temp row for `result.habit`. Import `MAX_ACTIVE_HABITS` for the copy.
  Comment the rollback. Verify: `npm run typecheck`.
- [x] 4.2 Update store tests that resolve `createHabitAction` with a bare habit to resolve with
  `{ ok: true, habit }` (`lib/__tests__/habit-creation-flow.test.ts`,
  `lib/__tests__/store-edge-cases.test.ts`, `lib/__tests__/_user-flow-helpers.ts`). Add a new test
  asserting a `{ ok:false, reason:"cap" }` result rolls back the optimistic add and shows a Toast.
  Verify with vitest.

## 5. Reusable HelpTip component

- [x] 5.1 Create `components/HelpTip.module.css`: relative wrapper, a small circular `?` trigger,
  and an absolutely-positioned popover bubble. Comment each token's visual purpose. No inline
  static styles.
- [x] 5.2 Create `components/HelpTip.tsx` (client component): a `<button type="button">` trigger
  with `aria-label` (default "Help", overridable), `aria-expanded`, and `aria-describedby`
  pointing at the popover `id`; popover has `role="tooltip"`; toggles on click, closes on Escape.
  Accepts the explanatory content via `children` and an optional `label`. Top-of-file JSDoc.
  Verify: `npm run typecheck`.
- [x] 5.3 Add `components/__tests__/HelpTip.test.tsx` covering: hidden by default; click reveals
  the text; trigger is `type="button"` and does not submit a surrounding form; `aria-expanded`
  flips; Escape closes. Verify with vitest.

## 6. New-habit page cap UX

- [x] 6.1 In `app/(root)/habits/new/page.tsx`, read `formationVerdicts` from the store, compute
  `activeHabitCount`/`remainingSlots` via `lib/habit-cap.ts`, and when `remainingSlots <= 0`:
  render a cap banner (CSS module class, no inline styles) explaining the 3-active-habit maximum
  and that the Hall of Fame frees a slot, with a `HelpTip`; disable the "Create habit" button; and
  guard `finalize()` so it no-ops at the cap. Always render a `HelpTip` near the header explaining
  the mechanic. Verify: `npm run typecheck` + manual reasoning against the spec scenarios.
- [x] 6.2 Add the cap-banner class(es) to `app/(root)/habits/new/page.module.css` with comments.
- [x] 6.3 Add `app/(root)/habits/new/__tests__/page.test.tsx` cap coverage (extend existing file):
  at 3 active habits the button is disabled and the cap message + HelpTip trigger render and
  `addHabit` is not called on click; with one inducted habit among three the button is enabled.
  Verify with vitest.

## 7. Validation & docs

- [x] 7.1 Update `README.md` and `AGENTS.md`: document the max-3-active-habits rule
  (active = not archived and not inducted; Hall of Fame frees a slot; server-authoritative) and
  the reusable `HelpTip` control in the component inventory / behaviour notes.
- [x] 7.2 Run the full gate: `npm exec vitest run`, `npm run typecheck`, `npm run lint:app`,
  `npm run build` — all green. Then push `feat/max-3-active-habits` (no PR).
