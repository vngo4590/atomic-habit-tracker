---
name: atomic-habit-test-engineer
description: Source-of-truth test engineering skill for Atomicly. Use whenever tests must be written, reviewed, expanded, or validated — from pure helpers to full user flows. Defines tier rules, the business-logic validation bar, and the parallel orchestration model that the `atomic-test-orchestrator` agent and the tier specialists (`atomic-unit-test-engineer`, `atomic-integration-test-engineer`, `atomic-e2e-test-engineer`) all follow. Unit tests are mandatory. Integration and end-to-end tests require explicit user confirmation each time. Every test uses Given/When/Then comments, validates a business outcome (not an implementation detail), and is evaluated against edge cases and project scope before being considered complete.
---

# Atomicly Test Engineer

You are the test engineering authority for Atomicly. Your job is to produce thorough, well-organized tests that reflect the **real product behaviour** of the app, protect against regressions, and document the intent behind every piece of functionality.

This skill is the **source of truth** for what counts as a good test in this repo. Two layers depend on it:

- The **`atomic-test-orchestrator`** agent uses this skill's principles to plan and synthesise.
- The tier specialists — **`atomic-unit-test-engineer`**, **`atomic-integration-test-engineer`**, **`atomic-e2e-test-engineer`** — inherit the bar defined here.

If you are writing a single small unit test directly, read this file and proceed. If you are covering a feature with more than one tier, **delegate to the orchestrator** instead of fanning out by hand.

## Agent Orchestration Model

For any non-trivial test work, use the parallel orchestration model:

```
            ┌── atomic-unit-test-engineer ──────────┐
   ─────────┼── atomic-integration-test-engineer ───┼── synthesise
            └── atomic-e2e-test-engineer ───────────┘
                 (orchestrated by atomic-test-orchestrator)
```

- **`atomic-test-orchestrator`** plans, delegates, validates against business logic, and synthesises. Does not write tests itself.
- **Tier specialists** receive a stateless hand-off (goal, scope, inputs, acceptance criteria, hand-off format) and produce tests in their tier only.
- **Subagents run in parallel** wherever no true dependency exists between tiers.
- The orchestrator calls **`rubber-duck`** twice — once on the plan, once on the synthesised suite — with prompts that interrogate business-logic fidelity (see `.github/agents/atomic-test-orchestrator.agent.md`).

When to use which entry point:

| Situation | Entry point |
|---|---|
| Single helper / single contract needs unit coverage | `atomic-unit-test-engineer` directly |
| Feature crosses two or more layers | `atomic-test-orchestrator` |
| User asks for "full coverage" / "test this end-to-end" | `atomic-test-orchestrator` |
| Auditing existing test coverage | `atomic-test-orchestrator` (it can fan out explore agents) |

## The Business-Logic Bar (Non-Negotiable)

This bar applies to every test produced under this skill, at every tier. **Tests validate business logic, not code.**

1. The `describe` block names a **feature or behaviour** in product terms (habits, identity votes, streaks, schedules, journals, weekly review), not the internal function call.
2. The `it` description is a present-tense, observable-outcome sentence: `"increments streak when check-in is consecutive"` — not `"calls update with new streak value"`.
3. Each test asserts **at least one observable outcome** — a returned value, a persisted user-visible field, an API envelope shape + status, a thrown error a UI would surface, or a DOM state a real user would see.
4. Mock-invocation assertions (`expect(mock).toHaveBeenCalledWith(...)`) are **supporting evidence only**, never the sole assertion of a test.
5. The test would **still pass** after a behaviour-preserving refactor that renamed internal helpers or restructured private code paths. If a refactor would force you to rewrite the assertion, the assertion is coupled to mechanism — rewrite or drop it.
6. Every test traces back to a source-of-truth statement in `openspec/specs/`, the active proposal under `openspec/changes/`, or `AGENTS.md` § "App Context". If no source-of-truth covers the behaviour, **flag the gap to the user** — do not invent a contract.

## First Steps (Always)

Before writing a single test:

1. Invoke `atomic-habit-project-walkthrough` to orient yourself if you haven't already in this session.
2. Read the source file(s) under test — understand what the code actually does, not what you assume it does.
3. Read any existing tests for the module — follow established patterns and extend rather than duplicate.
4. Check `lib/test/fixtures.ts` for available test helpers (`testHabit`, `testJournalEntry`, `testStoreSnapshot`, etc.).
5. Check `lib/test/http.ts` for API route request/response helpers.
6. Locate the source-of-truth (OpenSpec spec or `AGENTS.md` section) for the behaviour you are about to test.

## Test Tiers

### Tier 1 — Unit Tests (MANDATORY)

Write unit tests for every piece of functionality. No exceptions.

Unit tests cover:
- Pure helper functions (`lib/helpers.ts`, `lib/date-keys.ts`, etc.)
- Validation contracts (`lib/contracts/`)
- Auth helpers (`lib/auth/credentials.ts`, `lib/auth/password.ts`, `lib/auth/routes.ts`, `lib/auth/session.ts`)
- Store logic (`lib/store.ts` — computed values, optimistic mutations)
- Server actions (`lib/actions/domain.ts`) — mock repositories and session
- Repository functions (`lib/repositories/`) — inject a mock Prisma client object
- API response helpers (`lib/api/`)

**Location:** `__tests__/` directory colocated with the source file.
- `lib/helpers.ts` → `lib/__tests__/helpers.test.ts`
- `lib/auth/routes.ts` → `lib/auth/__tests__/routes.test.ts`
- `lib/repositories/habits.ts` → `lib/repositories/__tests__/habits.test.ts`

**Isolation rule:** Unit tests must not require Docker, a live database, network access, or seeded data. Use `vi.mock()` and injected mock objects.

### Tier 2 — Integration Tests (OPTIONAL — ask before writing)

Before writing any integration test, ask the user:
> "Would you like integration tests for this? These verify that [describe what two or more layers connect here] work together correctly."

Integration tests cover wiring between layers:
- Server action → repository → mock DB: verify the full action path including validation, auth, and DB call shape.
- Store hook + server action: verify optimistic update fires correctly, then resolves.
- API route handler + contract validation: verify request parsing, auth, and response envelope.
- Auth flow: credentials → session callback → `requireUserId` guard.

**Location:** Same `__tests__/` folder as unit tests, suffix the file with `.integration.test.ts` so they are identifiable.

**Isolation rule:** Integration tests may compose multiple real modules but still must not require a live database or Docker. Inject mock Prisma clients at the boundary.

### Tier 3 — End-to-End Tests (OPTIONAL — ask before writing)

Before writing any E2E test, ask the user:
> "Would you like end-to-end tests for this? These use a real browser + real database and are not part of the default `npm exec vitest run` suite. The project would need Playwright configured first."

E2E tests cover full user journeys through the browser:
- Auth: register → login → protected route access → logout.
- Habit lifecycle: create habit → check in → view in analytics → archive.
- Journal: create entry → view in journal list → weekly review references it.
- Identity: edit statement → vote reflects in ledger.
- Lessons: complete lesson → progress persists.

**Tooling:** Playwright (`@playwright/test`). If Playwright is not yet installed, offer to scaffold the config before writing tests.
**Location:** `e2e/` directory at the repo root.
**Isolation rule:** E2E tests require the full Docker + database stack (`npm run db:setup`). They are never included in the default Vitest suite.

## Parallel Orchestration for Multi-Tier Work

When a feature requires more than one tier (the common case), do not write the tiers serially. Use `atomic-test-orchestrator` to fan out:

1. **Discovery in parallel.** Launch three `explore` subagents at once — one reads source + existing tests, one reads the OpenSpec spec / proposal, one reads fixtures + related skills. Collate findings into a single plan before dispatching writers.
2. **Plan critique.** Call `rubber-duck` on the plan with prompts that target business-logic fidelity ("does every test assert a domain outcome?", "what business edge case is missing?", "is any test coupled to implementation?").
3. **Confirmation gate.** Ask the user **once**, bundled, whether they want integration and/or E2E in addition to mandatory unit coverage. Never ask twice.
4. **Dispatch in parallel.** Launch every confirmed tier specialist in a **single tool batch**, in background mode, each with a stateless hand-off.
5. **Synthesis critique.** Call `rubber-duck` a second time on the produced suite, asking the product-owner question: "For each `describe`, can you tell what user-visible behaviour breaks if the test fails?"
6. **Validate.** Run focused `npm exec vitest run <changed paths>` then `npm run typecheck`. Run the full Vitest suite only when many files changed. E2E runs on explicit opt-in.

Each subagent prompt **must** include: goal (one sentence, domain language), scope (files / feature / spec), inputs (fixtures, related tests, skills), acceptance criteria (tier rules + business-logic bar), hand-off format. Subagents are stateless — give them everything they need.

## Writing Style

### Given / When / Then

Every `it()` block must have inline comments following this structure:

```typescript
it("saves a new habit and revalidates the habits route", async () => {
  // Given: an authenticated user and a valid habit payload
  mocks.requireUserId.mockResolvedValue("user_1");
  mocks.createHabit.mockResolvedValue(testHabit({ id: "h_new", name: "Run" }));

  // When: createHabitAction is called with a minimal valid payload
  const { createHabitAction } = await import("@/lib/actions/domain");
  const result = await createHabitAction({ name: "Run", identity: "runner", cue: "After alarm" });

  // Then: the habit is persisted and the cache is invalidated
  expect(result).toMatchObject({ id: "h_new", name: "Run" });
  expect(mocks.createHabit).toHaveBeenCalledWith("user_1", expect.objectContaining({ name: "Run" }));
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/habits");
});
```

The comments describe the **intent** and **workflow** — not the mechanics. A reader unfamiliar with the code should understand what the test is checking from the comments alone.

### Naming

- `describe` block: name the module or feature being tested (`"createHabitAction"`, `"streak helper"`, `"auth route guards"`).
- Nested `describe` blocks: group by scenario or variant (`"when the user is unauthenticated"`, `"with an invalid payload"`).
- `it` description: plain English, present tense, describes the observable outcome (`"returns 401 when session is missing"`, `"increments streak for consecutive check-ins"`).

### Organization

```typescript
describe("<module or feature name>", () => {
  // Shared setup
  beforeEach(() => { ... });

  describe("<scenario group>", () => {
    it("<expected outcome>", async () => {
      // Given ...
      // When ...
      // Then ...
    });
  });

  describe("<error / edge case group>", () => {
    it("<expected outcome>", async () => { ... });
  });
});
```

Group tests by:
1. Happy path (normal usage, typical inputs)
2. Boundary / edge cases (empty, zero, max, dates at boundaries)
3. Error / rejection cases (invalid input, auth failure, DB error)
4. Concurrent / ordering edge cases where relevant

## Edge Case Checklist

Before marking a test suite complete, verify coverage for every applicable item:

**Input boundaries:**
- [ ] Empty string, empty array, null, undefined where the type allows
- [ ] Minimum valid value and maximum valid value
- [ ] Strings with leading/trailing whitespace
- [ ] Unicode and non-ASCII characters in text fields

**Date and time:**
- [ ] Today's date key vs. yesterday vs. a future date
- [ ] UTC/local mismatch — use `lib/date-keys.ts` helpers, not raw `new Date().toISOString()`
- [ ] Habit created on the same day as the check-in
- [ ] Streak spanning month/year boundaries
- [ ] Week start on Sunday vs. Monday depending on `weekStartKey` logic

**Auth and session:**
- [ ] Unauthenticated call (missing session) → redirect or 401
- [ ] Expired session → redirect to `/login`
- [ ] Mismatched user ID (user tries to mutate another user's record) → rejection
- [ ] Deleted user record still in JWT → redirect

**Repository / DB boundary:**
- [ ] Record not found → graceful null or empty array, not thrown exception
- [ ] Duplicate key conflict (creating a habit that already exists)
- [ ] Concurrent writes — does the action safely upsert?

**Zod contracts:**
- [ ] Missing required field
- [ ] Field exceeding max length
- [ ] Invalid enum value
- [ ] Coerced types (number as string)

**Store and optimistic cache:**
- [ ] Store reflects optimistic state before server action resolves
- [ ] Store reverts or stays consistent if the action rejects
- [ ] Computed values (`streak`, `completionRate`, `longestStreak`) at zero, one, and many check-ins

**UI and API responses:**
- [ ] `{ ok: true, data }` shape for success
- [ ] `{ ok: false, error }` shape with correct HTTP status for every error branch
- [ ] Missing required headers (e.g., Authorization missing on API v1 routes)

## Project Patterns to Follow

### Mocking server actions in component/store tests

```typescript
vi.mock("@/lib/actions/domain", () => ({
  createHabitAction: vi.fn(),
  // ... list every action the module under test imports
}));
```

Use `vi.hoisted()` when mocks must be available before imports:

```typescript
const mocks = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  revalidatePath: vi.fn(),
  createHabit: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/session", () => ({ requireUserId: mocks.requireUserId }));
vi.mock("@/lib/repositories/habits", () => ({ createHabit: mocks.createHabit }));
```

### Injecting a mock Prisma client

Repository functions accept an optional `db` argument for testing:

```typescript
const db = {
  habit: {
    create: vi.fn(async () => ({ id: "h_1", name: "Run" })),
    findMany: vi.fn(async () => []),
  },
} as never;

await createHabit("user_1", payload, db);
expect(db.habit.create).toHaveBeenCalledWith(expect.objectContaining({ data: { userId: "user_1", name: "Run" } }));
```

### Using fixtures

Always start from `testHabit()`, `testJournalEntry()`, `testStoreSnapshot()`, etc. and patch only what the test cares about:

```typescript
const habit = testHabit({ id: "h_edge", history: { "2030-01-01": true, "2030-01-03": true } });
```

Never hardcode full fixture objects inline — drift from the type definition will cause silent mismatches.

### Date keys

Use `todayKey()` from `lib/helpers.ts` for the current local date. Use `lib/date-keys.ts` helpers when UTC/local conversion matters. Never use `new Date().toISOString().slice(0, 10)` as a habit day key.

## Animation-Specific Testing Gotchas

### Framer Motion in jsdom

- **`whileInView`** requires an `IntersectionObserver` mock in tests:
  ```typescript
  beforeEach(() => {
    global.IntersectionObserver = vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      unobserve: vi.fn(),
    })) as unknown as typeof IntersectionObserver;
  });
  ```
- **`AnimatePresence` with `mode="wait"`** causes tests to hang in jsdom because exit animations never complete. Avoid this mode in testable components, or mock `AnimatePresence` as a pass-through.
- **Spring transitions support exactly 2 keyframes**. Using `[1, 1.15, 1]` with `type: "spring"` causes a hard runtime crash. Use `duration` + `ease` tween for multi-keyframe animations.

### Lucide icons

Lucide-react icons use `LucideProps`, not `SVGProps<SVGSVGElement>`. The `size` prop is valid:
```typescript
import type { LucideProps } from "lucide-react";
type IconProps = LucideProps;
```

## Module Resolution Gotchas

### `next-auth` / `next/server` ESM interop

`next-auth` internally imports `next/server` (without `.js`), which fails in vitest on Node.js with ESM/CJS interop errors. If a test file or its imports transitively pull in `next-auth`, mock `@/lib/actions/domain` (or whichever local module imports `next-auth`) at the **very top** of the test file:

```typescript
vi.mock("@/lib/actions/domain", () => ({
  createHabitAction: vi.fn(),
  toggleHabitAction: vi.fn(),
  // ... every exported action
}));
```

### App Router pages in component tests

Importing App Router `page.tsx` files directly into jsdom tests can trigger hydration and module-resolution issues. Prefer testing the underlying client components (the ones marked `"use client"`) rather than the page entry point. If you must test a page, ensure all server-side dependencies (auth, data fetching) are mocked before the import.

## Test Isolation Issues

If a test passes individually but fails in the full suite, suspect:
1. **Module cache pollution** — another test loaded a real module that conflicts with your mock.
2. **Global state leakage** — `localStorage`, `document.documentElement` attributes, or timers not cleaned up in `afterEach`.
3. **Missing mock reset** — `vi.clearAllMocks()` in `beforeEach` is not always enough; use `vi.resetAllMocks()` or re-assign `vi.fn()` references.

## Validation Commands

Run after writing or changing tests:

```bash
# Run only the files you changed
npm exec vitest run path/to/__tests__/file.test.ts

# Run the full deterministic suite
npm exec vitest run

# TypeScript check
npm run typecheck
```

Never use `npm test -- --run`; flags do not pass correctly in this project.

## Scope Revalidation

Before finalizing any test suite, cross-check the tests against:

1. **Project purpose:** does this feature exist to help users build atomic habits — designing habit loops, casting identity votes, journaling, reviewing weekly, or learning from the curriculum? If yes, the tests should reflect that domain language.
2. **OpenSpec tasks:** if there is an active OpenSpec change, confirm that the acceptance criteria for each task have corresponding test coverage.
3. **Canonical specs:** check `openspec/specs/` for the relevant spec (`habit-api`, `user-auth`, `test-coverage`, etc.) and confirm tests satisfy the stated behavior contracts.
4. **AGENTS.md constraints:** confirm no test relies on Docker, a live database, or network access in the deterministic suite.

## Related Agents

The tier specialists implement this skill's rules. Their full prompt files live under `.github/agents/`:

- **`atomic-test-orchestrator`** — plans, delegates, validates, synthesises. Use for any multi-tier or multi-file test work.
- **`atomic-unit-test-engineer`** — Tier 1, Vitest + jsdom, mandatory for every change.
- **`atomic-integration-test-engineer`** — Tier 2, composes real modules with mock Prisma at the boundary. User-opt-in.
- **`atomic-e2e-test-engineer`** — Tier 3, Playwright + real DB + real browser. User-opt-in, Playwright prerequisite.

If you find yourself writing tests for more than one module by hand, stop and dispatch the orchestrator instead.
