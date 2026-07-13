## Context

Atomicly persists habits in Postgres via Prisma. Two existing facts fully determine whether a
habit is "active" for the purpose of this cap, so **no schema change is required**:

- `Habit.archivedAt: DateTime?` (`prisma/schema.prisma:140`) — archived habits are excluded
  from `listHabits` (`lib/repositories/habits.ts:105-116`, `where: { archivedAt: null }`).
- Hall-of-Fame induction is computed at read time from `FormationVerdict.decision`
  (`prisma/schema.prisma:243-259`, enum `FormationDecision { formed, keep_practicing }`). A
  habit is "inducted" iff it has a verdict with `decision = formed`. The client mirrors this as
  the derived boolean `FormationVerdict.formed` (`lib/repositories/reflection.ts:105`,
  `formed: record.decision === "formed"`), which the Hall of Fame already uses
  (`app/(root)/hall-of-fame/page.tsx:62`, `verdicts.filter(v => v.formed)`).

The Pet ecosystem already solves the "capped resource with a friendly refusal" problem
(`lib/repositories/pets.ts:192-253` `AdoptResult`; `lib/store.ts:798-823`; `AdoptPanel` copy).
We deliberately copy that pattern so the two features stay consistent and so we inherit its
production-hardened rationale.

## Goals / Non-Goals

**Goals**
- One canonical definition of "active habit" shared by server and client so the two can never
  drift.
- Server is the source of truth; client is a mirror for UX only.
- Inducted habits free a slot; archived habits never count; existing over-cap data is
  grandfathered.
- A reusable, accessible help control users can rely on beyond this one screen.

**Non-Goals**
- No schema/migration/backfill.
- No change to how habits are archived or how verdicts are created.
- No cap on *total* (inducted + archived + active) habits — only active ones are limited.
- No auto-archiving to force users under the cap.

## Decisions

### Decision 1 — The "active habit" predicate (the seam)

**Active** ⇔ `archivedAt == null` AND no `FormationVerdict` with `decision = "formed"`.

- **Server (authoritative)** — a single Prisma count:
  ```ts
  db.habit.count({
    where: { userId, archivedAt: null, verdicts: { none: { decision: "formed" } } },
  })
  ```
  `verdicts` is the `FormationVerdict[]` relation on `Habit`; `none: { decision: "formed" }`
  selects habits with no *formed* verdict. A `keep_practicing` verdict therefore does **not**
  free a slot — only induction does.

- **Client (mirror)** — the store's `habits` already exclude archived rows (they come from
  `listHabits`), so the client only subtracts inducted habits using the same `formed` boolean:
  ```ts
  const inducted = new Set(verdicts.filter(v => v.formed).map(v => v.habitId));
  const activeCount = habits.filter(h => !inducted.has(h.id)).length;
  ```
  This is exactly symmetric with the server predicate (archived excluded upstream, formed
  excluded here).

Both live behind one shared module, `lib/habit-cap.ts`, which exports the constant
`MAX_ACTIVE_HABITS = 3` plus pure helpers `isInductedHabit(habitId, verdicts)` and
`activeHabitCount(habits, verdicts)`. The repository imports only the constant (it counts in
SQL); the client imports the constant and the pure helpers. The async repository counter is
named `countActiveHabits(userId, db)` to avoid clashing with the pure `activeHabitCount`.

**Alternative rejected:** storing a boolean `isActive` column. Rejected — it would need a
migration and a backfill, and would duplicate state that is already derivable, risking drift
whenever a habit is archived or a verdict changes.

### Decision 2 — Result-shape seam (discriminated union, not throw)

`createHabit` returns:
```ts
export type CreateHabitResult = { ok: true; habit: Habit } | { ok: false; reason: "cap" };
```
`createHabitAction` returns the same type. This mirrors `AdoptResult` exactly. The reason it is
a discriminated union rather than a thrown error: Next.js strips thrown error *messages* from
server actions in production (replacing them with a generic digest), which would hide *why* the
create was refused. A discriminated union survives the server→client boundary intact.

The cap check runs **before** `db.habit.create`, so a refused create performs no write.

### Decision 3 — Client enforcement + rollback

- The new-habit page computes `remainingSlots = max(0, MAX_ACTIVE_HABITS - activeCount)` and,
  when `remainingSlots <= 0`, disables the "Create habit" button and shows a cap banner
  explaining why (with a `HelpTip`). This is the primary, friendliest path.
- The optimistic `addHabit` store action still guards against races (e.g. two browser tabs):
  it adds an optimistic row, then on a `{ ok: false, reason: "cap" }` result it **removes the
  optimistic row** (by its `pending-…` temp id) and shows a Toast — instead of silently
  logging. On `{ ok: true }` it swaps the temp row for the server row as before.

### Decision 4 — Grandfathering

We never force-archive. Because enforcement is a `count >= MAX` gate on *create*, a user who
already has more than 3 active habits is simply blocked from creating new ones until their
active count falls below 3 (by archiving or inducting habits). No data is migrated or mutated.

### Decision 5 — Reusable `HelpTip`

A small client component: a focusable `<button type="button">` showing "?" that toggles a
popover. Accessibility:
- `aria-label` (e.g. "Help") on the trigger so it is announced.
- `aria-expanded` reflects open/closed state.
- `aria-describedby` / popover `id` associates the trigger with the revealed text.
- `role="tooltip"` on the popover; closes on `Escape` and on outside interaction; the trigger
  is reachable and operable by keyboard.
It takes the explanatory text as children/props so it is reusable for any mechanic, not just
this cap.

## Risks / Trade-offs

- **Client/server drift** — mitigated by the single shared `lib/habit-cap.ts` predicate and by
  tests asserting both sides agree (formed frees a slot; archived excluded).
- **Race between tabs** — the server is authoritative and the store rolls back gracefully, so
  the worst case is a Toast rather than an inconsistent state.
- **Grandfathered users feel stuck** — acceptable and intended; the cap banner + HelpTip
  explain that inducting or archiving a habit frees a slot.

## Migration Plan

None. No schema, data, or config migration. Purely additive behaviour derived from existing
columns. Rollback is a straight revert of the change.

## Open Questions

None outstanding — all product decisions were fixed in the change request.
