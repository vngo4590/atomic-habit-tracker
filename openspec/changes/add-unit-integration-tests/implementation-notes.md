## Coverage Audit

Existing deterministic coverage already includes:

- Unit tests for date helpers, schedule helpers, contracts, auth helpers, password hashing, database config, store optimistic behavior, and local database script command forwarding.
- Component/page tests for selected authenticated screens and reusable UI regressions.
- API route contract tests for session, habits, habit detail, and journal creation.
- Repository tests for selected ownership boundaries.

Critical uncovered or under-covered flows addressed by this change:

- Server action orchestration: authenticated user lookup, repository invocation, path revalidation, and unauthenticated negative paths.
- Reflection and lesson flows: journal, weekly review, identity, preferences, lesson progress, and formation verdict persistence call shapes.
- Repository mapping and ownership: habit list/create/update/archive/check-in/note/contract behavior plus reflection repository upserts and returned domain mapping.
- UI state regressions: lesson mode controls need accessible selected state and click feedback coverage.
- Deployment-adjacent invariants: local Kubernetes resources, image names, NodePort, health probes, and host PostgreSQL URL need deterministic checks.

## Test Classification

- Deterministic unit tests: helpers, contracts, auth utility behavior, store optimistic cache behavior, and UI state tests using jsdom.
- Deterministic integration tests: server actions, API route handlers, and repository functions with mocked external boundaries such as Auth.js, Prisma, and Next.js revalidation.
- Optional environment-dependent checks: live Docker PostgreSQL smoke tests, Kubernetes cluster rollout checks, and browser-level end-to-end tests. These are documented separately and are not part of the default `npm exec vitest run` suite.
