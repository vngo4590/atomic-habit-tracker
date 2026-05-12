# test-coverage Specification

## Purpose

Define the expected deterministic unit and integration test coverage for Atomicly, including documentation and deployment-adjacent validation boundaries.

## Requirements

### Requirement: Unit tests cover deterministic domain logic
The test suite SHALL include unit tests for deterministic domain logic that can run without network access, Docker, Kubernetes, or a live database.

#### Scenario: Helper or contract behavior changes
- **WHEN** date helpers, schedule helpers, validation contracts, auth utilities, or pure mapping functions are changed
- **THEN** focused unit tests SHALL verify valid inputs, invalid inputs, and edge cases relevant to the changed behavior

#### Scenario: Store behavior changes
- **WHEN** optimistic store logic or cache coordination changes
- **THEN** unit tests SHALL verify local state updates, rollback or reconciliation behavior, and out-of-order async save handling

### Requirement: UI unit tests cover interactive state changes
The test suite SHALL include component or page-level unit tests for user-visible interactive state that can regress without backend changes.

#### Scenario: User clicks a stateful control
- **WHEN** a user-facing control changes local state, visual active state, or accessible pressed/selected state
- **THEN** a UI test SHALL verify the state transition and the accessible state exposed to users

#### Scenario: Responsive or regression-prone UI behavior changes
- **WHEN** a reusable component, page layout, or mobile-sensitive control is changed
- **THEN** a regression test SHALL verify the expected behavior without relying on brittle implementation details

### Requirement: Integration tests cover authenticated server boundaries
The test suite SHALL include integration tests for authenticated server actions and route handlers that cross module boundaries.

#### Scenario: Server action mutates user data
- **WHEN** a server action creates, updates, archives, or saves authenticated user-owned data
- **THEN** an integration test SHALL verify session enforcement, repository invocation with the authenticated user ID, validation behavior, and relevant path revalidation

#### Scenario: API route handles invalid or unauthenticated requests
- **WHEN** an API route receives unauthenticated, stale-session, invalid, cross-user, or malformed input
- **THEN** an integration test SHALL verify the response status, stable error envelope, and absence of unauthorized writes

### Requirement: Integration tests cover persistence-facing repository contracts
The test suite SHALL verify repository behavior that protects user-owned data and maps persisted records into app domain types.

#### Scenario: Repository reads user-owned data
- **WHEN** a repository lists or retrieves habits, reflection records, lesson progress, preferences, identity, or formation verdicts
- **THEN** tests SHALL verify the query is scoped to the authenticated user and excludes records outside that ownership boundary

#### Scenario: Repository writes user-owned data
- **WHEN** a repository creates, updates, upserts, archives, or deletes user-owned data
- **THEN** tests SHALL verify owner fields, unique keys, validation parsing, and returned domain mapping

### Requirement: Critical reflection and lesson flows have integration coverage
The test suite SHALL include integration coverage for reflection and lesson workflows that are central to the app experience.

#### Scenario: Lesson progress changes
- **WHEN** a user marks a lesson read or changes lesson selection mode
- **THEN** tests SHALL verify the progress or preference is persisted through the expected server boundary and reflected in returned state

#### Scenario: Reflection records change
- **WHEN** a user saves journal entries, weekly reviews, identity values, preferences, or formation verdicts
- **THEN** tests SHALL verify validation, authenticated ownership, persistence call shape, and returned domain state

### Requirement: Deployment-adjacent configuration has deterministic checks
The test suite or validation scripts SHALL check local deployment configuration that can be verified without requiring a live Kubernetes cluster.

#### Scenario: Local Kubernetes overlay changes
- **WHEN** files under `k8s/local/` are changed
- **THEN** validation SHALL render the overlay or otherwise verify expected resources, image names, NodePort, health probe path, and host PostgreSQL `DATABASE_URL`

#### Scenario: Container build configuration changes
- **WHEN** `Dockerfile`, `.dockerignore`, or local deployment documentation changes
- **THEN** validation SHALL verify documented image targets and runtime assumptions remain aligned with the manifests

### Requirement: Test commands and boundaries are documented
Project documentation SHALL describe how to run focused tests, the full deterministic test suite, and any optional environment-dependent checks.

#### Scenario: Developer prepares a broad change
- **WHEN** a developer reads the validation documentation
- **THEN** they can identify which commands run focused tests, all Vitest tests, typecheck, lint, build, and local deployment manifest validation

#### Scenario: Test requires external services
- **WHEN** a test requires Docker PostgreSQL, Kubernetes, network access, or seeded data
- **THEN** it SHALL be documented as optional or environment-dependent and SHALL NOT be required by the default `npm exec vitest run` suite
