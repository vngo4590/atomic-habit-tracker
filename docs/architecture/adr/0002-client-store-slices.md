# ADR-0002: Client cache split into feature slices with one optimistic-mutation helper

- Status: Accepted
- Date: 2026-11-27

## Context

`lib/store.ts` is a single `useStore` hook holding every domain's state
(habits, journal, identity, reviews, lessons, verdicts, preferences, pets,
toast). Each mutation re-implements its own optimistic update, server call,
logging and error handling. This has already caused inconsistent behaviour:
`toggleHabit` does not roll back the optimistic change when the server action
rejects, so the UI can show a check-in that was never saved.

The store is an in-memory cache seeded from the server snapshot. It is not a
persistence layer (see `AGENTS.md`).

## Options

| Option | Pros | Cons |
|---|---|---|
| Keep one hook, extract helpers | Small change | Still one god-hook; every consumer re-renders on any change |
| **Per-feature slice hooks composed by `StoreProvider`, plus a shared `optimistic()` helper (chosen)** | No new dependency; consistent rollback/toast/logging; slices testable alone | Migration work; must keep the `StoreState` surface stable during the move |
| Adopt Zustand/Redux/TanStack Query | Mature tooling | New dependency and mental model for a cache that is mostly server-snapshot driven |

## Decision

- Each feature owns a `use<Feature>Slice(snapshot, deps)` hook in `features/<domain>/store.ts`.
- `StoreProvider` composes the slices into the existing `StoreState` shape so
  pages do not change during migration.
- All optimistic writes go through one helper:
  apply the patch -> call the server action -> on success reconcile with the
  server result -> on failure restore the previous state, log and show a toast.
- Pure metrics (`streak`, `longestStreak`, `completionRate`) move to
  `features/habits/model/metrics.ts`. `lib/store.ts` re-exports them until
  callers migrate.

## Consequences

- Rollback, logging and user feedback become uniform. The `toggleHabit` no-rollback bug is fixed by construction.
- Revisit if cross-slice derived state or re-render cost becomes a measured bottleneck. Selector-based context or an external store would then be justified.
