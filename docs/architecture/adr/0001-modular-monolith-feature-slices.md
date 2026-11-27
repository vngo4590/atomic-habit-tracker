# ADR-0001: Modular monolith organised by feature slices

- Status: Accepted
- Date: 2026-11-27

## Context

Atomicly is one Next.js 16 app maintained by a very small team. Code is grouped
by technical layer (`components/`, `lib/actions/`, `lib/repositories/`,
`lib/contracts/`) rather than by business capability. Symptoms:

- `lib/store.ts` (~1,050 lines) owns every domain's client state.
- `components/` is a flat folder of ~34 components from unrelated domains.
- Six more files exceed 400 lines; nothing stops one domain reaching into
  another's internals.

Drivers: maintainability (a change to one capability touches one folder),
extensibility (adding a capability does not edit shared god-files), low
operational cost, and fast local feedback (CI is currently disabled).

## Options

| Option | Pros | Cons |
|---|---|---|
| Keep layered layout, just split big files | Least churn | Domain logic stays scattered across 4+ folders |
| **Modular monolith, feature slices (chosen)** | Cohesive features, one deployable, enforceable boundaries | One-off migration cost |
| Separate services / packages (monorepo) | Independent deploys | No forcing reason; adds infra + release overhead for a solo team |

## Decision

Keep a single deployable Next.js app. Organise code into feature modules:

```
app/                  routes only - thin pages/layouts that compose feature UI
features/<domain>/
  model/              pure domain logic (no React, no Prisma, no I/O)
  server/             server actions + repositories ("server-only")
  ui/                 feature components + CSS Modules + tests
  contracts.ts        Zod schemas shared by client, actions and /api/v1
  index.ts            public API; other modules import only from here
shared/               cross-cutting primitives (ui kit, dates, logger, db, security)
```

Dependency direction is one-way: `app -> features -> shared`. A feature may use
another feature only through its `index.ts`. `model/` stays pure so it can be
unit-tested without mocks.

Migration is incremental (strangler fig): move one feature at a time, keep
re-export shims at old paths until callers move, delete shims last.

## Consequences

- Positive: changes stay local; boundaries are lint-enforced; pure logic is cheap to test.
- Negative: large mechanical moves; import paths churn during migration.
- Revisit if a capability needs independent scaling or deployment (e.g. a mobile
  API under separate load), which would justify extracting a service.

## Fitness functions

- ESLint `no-restricted-imports`: no deep imports into another feature; `model/`
  must not import React, Prisma or `server/`.
- Source files stay under ~300 lines (generated code excepted).
