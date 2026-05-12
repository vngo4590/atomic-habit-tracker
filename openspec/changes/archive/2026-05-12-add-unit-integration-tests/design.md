## Context

Atomicly uses Vitest, Testing Library, jsdom, Prisma, Auth.js, Next.js App Router route handlers, server actions, and a local Docker PostgreSQL database. Existing tests cover important slices: helper utilities, auth helpers, repository ownership checks, store optimistic updates, API route contracts, local database scripts, and selected page regressions.

Coverage is still uneven around server-action orchestration, cross-module integration boundaries, reflection/lesson flows, reusable test setup, and deployment-adjacent invariants. The goal is to make coverage systematic without slowing every validation run or requiring a live database for ordinary development.

## Goals / Non-Goals

**Goals:**

- Define a clear unit/integration split for Atomicly tests.
- Keep `npm exec vitest run` deterministic and usable without Docker, Kubernetes, network access, or a seeded local database.
- Add focused unit tests for pure helpers, validation contracts, auth utilities, optimistic store behavior, and UI state transitions.
- Add integration tests for server actions, route handlers, repository orchestration, auth/session edge cases, reflection flows, lesson progress, and deployment configuration.
- Introduce reusable test fixtures/helpers only where they reduce duplication and improve clarity.
- Document when to run focused tests, full tests, and optional live-database checks.

**Non-Goals:**

- Adding a new end-to-end browser test framework in this change.
- Requiring Kubernetes or Docker to run the default test suite.
- Rewriting existing tests into a new structure without a coverage reason.
- Pursuing numeric coverage thresholds before the critical flows are covered.
- Changing runtime behavior except for defects discovered while adding tests.

## Decisions

### D1 - Use existing Vitest and Testing Library stack

**Decision:** Continue using Vitest for unit and integration tests, with Testing Library for React component/page tests.

**Rationale:** The project already depends on Vitest, jsdom, and Testing Library. Adding Jest or Playwright would increase setup cost without being required for the requested unit/integration coverage.

**Alternative considered:** Add Playwright immediately for full browser flows. This is useful later, but it is broader than unit/integration coverage and would introduce server lifecycle and browser installation concerns.

### D2 - Default integration tests use controlled mocks, not a live database

**Decision:** Integration tests in the normal suite SHALL exercise multiple app modules together while mocking external boundaries such as Auth.js session lookup, Prisma clients, and Next.js revalidation.

**Rationale:** This catches contract and orchestration bugs while keeping `npm exec vitest run` fast and reliable on any developer machine or CI runner.

**Alternative considered:** Run all integration tests against Docker PostgreSQL. This gives stronger persistence confidence but makes the default suite depend on Docker state, migrations, seed data, and cleanup. Live database checks can be added as an explicit optional script after the deterministic suite is in place.

### D3 - Test utilities stay small and local-first

**Decision:** Add shared test helpers only for repeated setup patterns: authenticated sessions, route-handler request creation, StoreProvider/page fixtures, mock Prisma clients, and representative domain records.

**Rationale:** Helpers should remove duplicated ceremony without hiding the behavior under test. Existing colocated tests remain valid when they are readable.

**Alternative considered:** Create a large global test harness. That risks making tests harder to inspect and increases coupling across unrelated modules.

### D4 - Integration coverage follows product risk

**Decision:** Prioritize flows where regressions would lose data, cross user boundaries, break auth, or make deployment unusable.

Priority areas:
- Auth/session validation and stale user handling.
- User-owned habit, reflection, lesson, identity, and preference mutations.
- Server action revalidation and repository calls.
- API route validation, status codes, and response envelopes.
- Optimistic store behavior when async saves resolve out of order.
- Local Kubernetes manifest invariants that can be checked without a live cluster.

**Alternative considered:** Test by file count or coverage percentage first. That can reward low-value tests while missing high-risk flows.

## Risks / Trade-offs

- **Mock-heavy integration tests can miss Prisma-specific behavior** -> Keep repository tests focused on generated query shapes and ownership constraints; add optional live-database tests later for migration-sensitive behavior.
- **Shared helpers can become opaque** -> Keep helpers narrowly named, typed, and close to tests when possible.
- **Tests can over-constrain UI copy** -> Prefer roles, labels, state, and behavioral assertions; use exact text only where the text is itself a user-facing requirement.
- **Server action tests can be brittle around Next.js internals** -> Mock `next/cache` and auth/session boundaries explicitly; assert revalidation paths and repository effects rather than framework implementation details.
- **Local deployment tests can become environment-dependent** -> Validate manifest text/rendered kustomize output where possible; do not require a running Kubernetes cluster in default tests.

## Migration Plan

1. Audit current tests and list the highest-risk uncovered flows.
2. Add or refine lightweight test helpers for common auth, route, store, and fixture setup.
3. Add focused unit tests for helpers/contracts/UI state that currently lack coverage.
4. Add integration tests for server actions and route handlers using controlled mocks.
5. Add deployment-adjacent assertions for local Kubernetes and Docker configuration where deterministic.
6. Update README or scripts documentation with test boundaries and commands.

Rollback is straightforward: tests and test utilities are additive. If a test helper causes churn, remove the helper and keep the individual tests colocated.

## Open Questions

- Should optional live-database integration tests be added in this change behind a separate script, or proposed as a follow-up after deterministic integration coverage is complete?
- Should CI eventually enforce coverage thresholds, or should it first enforce named critical-flow test files?
