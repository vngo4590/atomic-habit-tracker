---
name: atomic-habit-test-engineer
description: Top-level test engineering skill for Atomicly. Use when planning a test effort, choosing between writing tests yourself versus dispatching the orchestrator, or onboarding a tier-specialist. Points to the atomic sub-skills that own the detailed rules — quality bar, tier policy, edge cases, and mocking patterns — and to the `atomic-test-orchestrator` agent that runs the parallel model.
---

# Atomicly Test Engineer

> **TL;DR:** Tests validate **business logic, not code**. Unit is mandatory; integration and E2E are opt-in. Multi-tier work goes through `atomic-test-orchestrator`.

This skill is the **entry point** for all test engineering in the repo. Detailed rules live in atomic sub-skills so they can be referenced individually by tier-specialist agents.

## Choose your entry point

| Situation | Where to start |
|---|---|
| Writing a single small unit test directly | This skill + `atomic-habit-test-quality-standard`, then write the test |
| Feature crosses two or more layers | `atomic-test-orchestrator` agent |
| User asks for "full coverage" or "test this end-to-end" | `atomic-test-orchestrator` agent |
| Auditing existing test coverage | `atomic-test-orchestrator` agent (it can fan out `explore` agents) |

## Sub-skills (read the ones relevant to your task)

| Sub-skill | When to load it |
|---|---|
| **`atomic-habit-test-quality-standard`** | Always — defines the business-logic bar, Given/When/Then comments, naming, and suite organization. |
| **`atomic-habit-test-tier-policy`** | When deciding *which tier* to write at and what each tier may touch; also defines the parallel orchestration model. |
| **`atomic-habit-test-edge-cases`** | Before declaring a suite complete — the input / date / auth / repo / Zod / store / UI checklist. |
| **`atomic-habit-test-mocking-patterns`** | When setting up mocks — `vi.mock` / `vi.hoisted`, mock Prisma, Framer Motion in jsdom, `next-auth` ESM interop, `localStorage` stubbing. |

## Always do first

Before writing a single test:

1. Invoke `atomic-habit-project-walkthrough` (or `atomic-habit-architecture` directly) if you don't already know where the code under test sits.
2. Read the source file(s) under test — understand what the code actually does.
3. Read any existing tests for the module — follow established patterns and extend rather than duplicate.
4. Check `lib/test/fixtures.ts` for available test helpers (`testHabit`, `testJournalEntry`, `testStoreSnapshot`, etc.) — see `atomic-habit-test-mocking-patterns`.
5. Check `lib/test/http.ts` for API route request/response helpers.
6. Locate the source-of-truth (OpenSpec spec or `AGENTS.md` section) for the behaviour you are about to test.

## Related agents

The tier specialists implement the sub-skill rules. Their full prompt files live under `.github/agents/`:

- **`atomic-test-orchestrator`** — plans, delegates, validates, synthesises. Use for any multi-tier or multi-file test work.
- **`atomic-unit-test-engineer`** — Tier 1, Vitest + jsdom, mandatory for every change.
- **`atomic-integration-test-engineer`** — Tier 2, composes real modules with mock Prisma at the boundary. User-opt-in.
- **`atomic-e2e-test-engineer`** — Tier 3, Playwright + real DB + real browser. User-opt-in, Playwright prerequisite.

If you find yourself writing tests for more than one module by hand, stop and dispatch the orchestrator instead.

## Validation commands

```bash
npm exec vitest run path/to/__tests__/file.test.ts   # focused
npm exec vitest run                                  # full deterministic suite
npm run typecheck                                    # TypeScript
```

> Never use `npm test -- --run`; flags do not pass through reliably.

For the full validation gate (lint, build, etc.) → `atomic-habit-pre-push-checklist`.
