## Why

Atomicly now has backend-backed auth, Prisma repositories, server actions, API routes, optimistic client state, and local Kubernetes/container deployment paths. The current test suite covers important helpers and selected pages, but coverage is uneven across server actions, integration boundaries, persistence flows, and deployment-sensitive behavior.

This change establishes a deliberate unit and integration test plan so future feature work can move faster without regressing authentication, user-owned data scoping, reflection flows, lesson progress, and local deployment assumptions.

## What Changes

- Add a testing strategy that clearly separates fast unit tests from integration tests that exercise multi-module behavior.
- Expand unit tests around pure helpers, auth utilities, contracts, repository ownership rules, store behavior, and UI state transitions.
- Add integration tests for server actions, API route handlers, auth/session edge cases, lesson/reflection persistence flows, and local deployment configuration invariants.
- Standardize reusable test utilities for authenticated users, mocked sessions, repository fixtures, route-handler requests, and StoreProvider/page rendering.
- Document validation commands and expected test boundaries so contributors know when to run focused tests versus the full suite.

## Capabilities

### New Capabilities

- `test-coverage`: Defines required unit and integration test coverage for Atomicly's critical app, auth, data, API, and deployment-adjacent behavior.

### Modified Capabilities

<!-- No existing product capability requirements change. This proposal adds an internal quality capability for test coverage. -->

## Impact

- **`lib/**/__tests__` and `components/**/__tests__`** — additional unit tests for helpers, contracts, store behavior, auth utilities, and reusable UI components.
- **`app/**/__tests__`** — route/page interaction tests for authenticated app workflows and UI regressions.
- **`app/api/**/__tests__`** — route-handler integration coverage for `/api/v1` endpoints and auth/session behavior.
- **`lib/actions/**` and `lib/repositories/**`** — integration tests for server-action orchestration and user-owned data scoping.
- **`scripts/**/__tests__` and `k8s/local/` validation** — tests or assertions for local deployment scripts/manifests where behavior can be verified without a live cluster.
- **Test utilities** — likely new shared helpers under `lib/test/`, `test/`, or colocated `__tests__/helpers.ts` depending on existing patterns.
- **No runtime behavior changes** are intended beyond fixes that tests expose.
