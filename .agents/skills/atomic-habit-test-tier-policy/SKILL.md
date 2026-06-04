---
name: atomic-habit-test-tier-policy
description: Atomicly's three-tier test policy — which tier covers what, what each tier may touch, where tests live, and the parallel orchestration model. Use whenever planning a test effort, deciding whether to write a unit, integration, or end-to-end test, or routing work between the test orchestrator and tier specialists.
---

# Atomicly Test Tier Policy

> **TL;DR:** Unit tests are mandatory. Integration and E2E require explicit user confirmation each time. Multi-tier work is dispatched in parallel by `atomic-test-orchestrator`.

This skill is the source of truth for **tier boundaries, location, isolation rules, and orchestration topology**. The three tier-specialist agents inherit these rules; the orchestrator enforces them.

## 1. Entry-Point Decision Table

| Situation | Entry point |
|---|---|
| Single helper / single contract needs unit coverage | `atomic-unit-test-engineer` directly |
| Feature crosses two or more layers | `atomic-test-orchestrator` |
| User asks for "full coverage" / "test this end-to-end" | `atomic-test-orchestrator` |
| Auditing existing test coverage | `atomic-test-orchestrator` (fans out `explore` agents) |

## 2. Tier 1 — Unit Tests (MANDATORY)

Write unit tests for every piece of functionality. **No exceptions.**

**Covers:**
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

**Isolation:** Must not require Docker, a live database, network access, or seeded data. Use `vi.mock()` and injected mock objects. See `atomic-habit-test-mocking-patterns`.

**Specialist:** `atomic-unit-test-engineer`.

## 3. Tier 2 — Integration Tests (OPT-IN — ask first)

Before writing any integration test, ask the user:

> "Would you like integration tests for this? These verify that [describe the layers that connect here] work together correctly."

**Covers wiring between layers:**
- Server action → repository → mock DB: verify the full action path including validation, auth, and DB call shape.
- Store hook + server action: verify optimistic update fires correctly, then resolves.
- API route handler + contract validation: verify request parsing, auth, and response envelope.
- Auth flow: credentials → session callback → `requireUserId` guard.

**Location:** Same `__tests__/` folder as unit tests, with the suffix `.integration.test.ts`.

**Isolation:** May compose multiple real modules but must not require a live database or Docker. Inject mock Prisma clients at the boundary.

**Specialist:** `atomic-integration-test-engineer`.

## 4. Tier 3 — End-to-End Tests (OPT-IN — ask first)

Before writing any E2E test, ask the user:

> "Would you like end-to-end tests for this? These use a real browser + real database and are not part of the default `npm exec vitest run` suite. The project would need Playwright configured first."

**Covers full user journeys through the browser:**
- Auth: register → login → protected route access → logout.
- Habit lifecycle: create habit → check in → view in analytics → archive.
- Journal: create entry → view in journal list → weekly review references it.
- Identity: edit statement → vote reflects in ledger.
- Lessons: complete lesson → progress persists.

**Tooling:** Playwright (`@playwright/test`). If not yet installed, offer to scaffold the config before writing tests.
**Location:** `e2e/` directory at the repo root.
**Isolation:** Requires the full Docker + database stack (`npm run db:setup`). Never included in the default Vitest suite.

**Specialist:** `atomic-e2e-test-engineer`.

## 5. Parallel Orchestration Model

For multi-tier work, use the orchestrator. Do not fan out by hand.

```
            ┌── atomic-unit-test-engineer ──────────┐
   ─────────┼── atomic-integration-test-engineer ───┼── synthesise
            └── atomic-e2e-test-engineer ───────────┘
                 (orchestrated by atomic-test-orchestrator)
```

- **`atomic-test-orchestrator`** plans, delegates, validates against business logic, and synthesises. Does not write tests itself.
- **Tier specialists** receive a stateless hand-off (goal, scope, inputs, acceptance criteria, hand-off format) and produce tests in their tier only.
- **Subagents run in parallel** wherever no true dependency exists between tiers.
- The orchestrator calls **`rubber-duck`** twice — once on the plan, once on the synthesised suite — with prompts that interrogate business-logic fidelity.

### Hand-off template (use verbatim per subagent)

```
GOAL (one sentence, domain language):

SCOPE:
- Source file(s):
- Feature area:
- OpenSpec reference:

INPUTS:
- Fixtures available:
- Related existing tests:
- Skills to consult:

ACCEPTANCE CRITERIA:
- Tier: [unit | integration | e2e]
- Every test has Given/When/Then comments.
- Every test has at least one observable-outcome assertion.
- No assertion is solely a mock-call check.
- Naming uses domain language.
- Validation command run: <exact command>.

HAND-OFF FORMAT:
- Files created/modified (paths):
- Test counts (by describe block):
- Validation output (pass/fail counts, time):
- Open gaps and rationale:
```

## 6. Validation Commands

```bash
npm exec vitest run path/to/__tests__/file.test.ts   # focused
npm exec vitest run                                  # full deterministic suite
npm run typecheck                                    # TypeScript
npm run test:e2e                                     # Playwright (requires dev server + DB)
```

Never use `npm test -- --run`; flags do not pass through correctly in this project.

## See Also

- `atomic-habit-test-quality-standard` — the bar every test must meet
- `atomic-habit-test-edge-cases` — what scenarios to cover
- `atomic-habit-test-mocking-patterns` — how to isolate test subjects
- `atomic-habit-local-dev` — DB / Docker setup commands referenced above
