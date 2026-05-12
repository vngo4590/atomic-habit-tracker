## 1. Coverage Audit and Test Boundaries

- [x] 1.1 Audit existing tests under `app/`, `components/`, `lib/`, and `scripts/` and list critical uncovered flows in this change's implementation notes or PR summary
- [x] 1.2 Classify planned tests as deterministic unit tests, deterministic integration tests, or optional environment-dependent checks
- [x] 1.3 Confirm the default `npm exec vitest run` suite does not require Docker, Kubernetes, network access, seeded data, or a live database

## 2. Test Utilities and Fixtures

- [x] 2.1 Add or refine small typed fixtures for representative users, habits, journal entries, weekly reviews, preferences, lesson progress, and formation verdicts
- [x] 2.2 Add reusable helpers for mocked authenticated sessions and stale/deleted-user session scenarios
- [x] 2.3 Add reusable helpers for route-handler `Request` creation and JSON response parsing where existing tests duplicate setup
- [x] 2.4 Add StoreProvider/page rendering helpers only where they reduce repeated setup in UI tests without hiding behavior
- [x] 2.5 Keep colocated test helper files near the tests that use them unless a helper is shared across multiple modules

## 3. Unit Tests

- [x] 3.1 Add focused unit tests for any uncovered date, schedule, lesson-selection, appearance, or mapping helpers identified in the audit
- [x] 3.2 Add or expand contract tests for habit, reflection, lesson, preference, and formation verdict validation edge cases
- [x] 3.3 Add or expand auth utility tests for credential validation, stale user handling, session policy, and route protection edge cases
- [x] 3.4 Add or expand store tests for lesson mode/progress, preference updates, reflection updates, and out-of-order async save reconciliation
- [x] 3.5 Add UI tests for stateful controls whose visual or accessible state can regress, including lesson mode controls and reusable chip/tab interactions

## 4. Server Action Integration Tests

- [x] 4.1 Add integration tests for habit server actions covering session enforcement, repository calls with authenticated user ID, validation failures, and app path revalidation
- [x] 4.2 Add integration tests for journal and weekly review server actions covering create/update/save behavior, validation failures, and route revalidation
- [x] 4.3 Add integration tests for identity, preferences, lesson progress, and formation verdict server actions covering persistence call shape and returned state
- [x] 4.4 Add negative-path tests proving unauthenticated server actions reject or redirect before repository writes occur

## 5. Repository and API Integration Tests

- [x] 5.1 Expand repository tests for habit list/detail/create/update/archive/check-in/note/contract ownership and domain mapping
- [x] 5.2 Add repository tests for reflection flows: journal entries, weekly reviews, identity, preferences, completed lessons, and formation verdicts
- [x] 5.3 Expand `/api/v1` route-handler tests for authenticated success paths, validation errors, stale sessions, not-found/cross-user behavior, and stable response envelopes
- [x] 5.4 Verify API route tests do not depend on React context, browser storage, or live Prisma connections

## 6. Deployment-Adjacent Checks

- [x] 6.1 Add a deterministic test or script assertion for `k8s/local` that verifies rendered resources include namespace, secret, web Service/Deployment, migration Job, NodePort `30080`, `/api/healthz` probes, and `host.docker.internal:55432`
- [x] 6.2 Add a deterministic check that local deployment documentation, Docker image target names, and Kubernetes manifest image names remain aligned
- [x] 6.3 Document any optional live Docker/PostgreSQL or Kubernetes smoke checks separately from the default Vitest suite

## 7. Documentation and Validation

- [x] 7.1 Update `README.md` and/or `scripts/README.md` with focused test commands, full deterministic suite commands, and optional environment-dependent checks
- [x] 7.2 Run focused tests for newly added test files
- [x] 7.3 Run `npm exec vitest run`
- [x] 7.4 Run `npm run typecheck`
- [x] 7.5 Run `npm run lint:app`
- [x] 7.6 Run `npm run build`
- [x] 7.7 Run `kubectl kustomize k8s/local` or the new deterministic manifest validation command if Kubernetes docs/manifests are touched
