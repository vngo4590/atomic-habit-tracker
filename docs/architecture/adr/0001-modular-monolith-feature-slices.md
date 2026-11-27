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

Keep a single deployable Next.js app. Organise business capabilities into
feature modules and keep `lib/` as the shared kernel for cross-cutting
infrastructure (db, auth, security, logger, dates, http helpers, shared entity
types). Moving that infrastructure would churn 100+ imports for no benefit.

```
app/                  routes only - thin pages/layouts that compose feature UI
features/<domain>/    habits | stacks | reflection | settings | pet
  model/              pure domain logic (no React, no Prisma, no I/O)
  server/             repositories ("server-only")
  ui/                 feature components + CSS Modules + tests
  contracts.ts        Zod schemas used by actions, /api/v1 and forms
  actions.ts          "use server" actions (safe to import from client code)
  store.ts            the feature's slice of the client cache (client-only)
  index.ts            client-safe public API (pure model only)
  server.ts           server-only public API (repositories) for routes/layouts
components/ui/        design-system primitives (Button, Card, Sheet, ...)
components/           app-shell components (Nav, StoreProvider, Toast, ...)
lib/                  shared kernel (no business rules)
```

Each feature has exactly three public entry points: `index.ts` (client-safe),
`actions.ts` (server actions callable from the client) and `server.ts`
(server-only data access). This split guarantees database code never reaches
a browser bundle.

Amendment (Phase B3): two more entry points were added. `store.ts` is the
client-only cache slice composed by `lib/store`. `contracts.ts` is imported
directly as `@/features/<x>/contracts` and is **not** re-exported from
`index.ts`: Zod schemas are built at module load, so bundlers cannot
tree-shake them, and re-exporting them added ~64 KB gz to every route.

Dependency direction is one-way: `app -> features -> lib`. A feature may use
another feature only through those entry points. `model/` stays pure so it can
be unit-tested without mocks.

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
