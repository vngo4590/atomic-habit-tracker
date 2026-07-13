## Why

Atomicly is built around the idea that lasting change comes from a *small* number of
deliberate votes for who you want to become — not from a sprawling checklist. Today a user
can create unlimited habits, which invites the over-commitment that quietly kills habit
formation. We want to gently enforce focus: a user may keep at most **3 active habits** at a
time. Once a habit is truly formed (inducted into the Hall of Fame) it stops competing for
attention, so it should free a slot while remaining fully trackable.

Users also need to understand *why* they are being stopped when they try to add a 4th habit.
There is currently no reusable way to attach a small contextual explanation to any control,
so the cap would feel like an arbitrary wall.

## What Changes

- Introduce a **maximum of 3 active habits** per user. An "active" habit is one that is **not
  archived** (`archivedAt == null`) **and not inducted** into the Hall of Fame (has no
  `FormationVerdict` with `decision = formed`).
- Enforce the cap **server-side as the source of truth**: the create-habit repository rejects
  the 4th active habit with a structured, discriminated result (`{ ok: false, reason: "cap" }`)
  rather than throwing — mirroring the existing Pet-adoption cap. The server action and the
  `/api/v1/habits` route surface this result (the route returns HTTP 409).
- **Mirror the cap client-side**: the new-habit page computes the active-habit count and
  disables submission at the cap, and the optimistic store path rolls back and shows a Toast if
  the server refuses (e.g. a race between tabs).
- Inducted (`formed`) habits **do not count** toward the cap and remain fully trackable;
  archived habits never count. **Existing data is grandfathered** — no habit is force-archived;
  users already above the cap simply cannot create new habits until their active count drops
  below 3. No migration or backfill.
- Add a small **reusable, accessible `?` help component** (`HelpTip`) — a keyboard-focusable
  button that reveals an `aria`-wired explanatory popover. Use it on the new-habit page to
  explain the "max 3 active habits, Hall of Fame frees a slot" mechanic, and show a clear
  "cap reached" message (same explanation) when the user is at 3 active habits — mirroring the
  tone of the Pet ecosystem's "ecosystem is full" messaging.

## Capabilities

### New Capabilities
- `habit-active-cap`: The rule that a user may have at most 3 active habits, including the
  definition of "active", server-side enforcement with a discriminated result, the
  inducted-frees-a-slot and archived-excluded behaviour, grandfathering of existing data, and
  the client-side mirror (disabled submit + Toast rollback + contextual explanation).
- `help-tip`: A reusable, accessible contextual help/info control (a focusable `?` button that
  toggles an `aria`-associated popover) used to explain product mechanics inline.

### Modified Capabilities
<!-- None — there are no existing specs under openspec/specs/ for habit creation, so both
areas are introduced as new capabilities. -->

## Impact

- **Domain / shared**: new `lib/habit-cap.ts` (the `MAX_ACTIVE_HABITS` constant + a pure
  `activeHabitCount(habits, verdicts)` / `isInductedHabit(habitId, verdicts)` helper shared by
  client and server so the predicate cannot drift).
- **Repository**: `lib/repositories/habits.ts` — new async `countActiveHabits(userId, db)`;
  `createHabit` now returns a `CreateHabitResult` discriminated union and enforces the cap.
- **Server action**: `lib/actions/domain.ts` — `createHabitAction` returns `CreateHabitResult`.
- **API**: `app/api/v1/habits/route.ts` — POST returns 409 when the cap is hit.
- **Store**: `lib/store.ts` — `addHabit` handles the discriminated result, rolling back the
  optimistic add and surfacing a Toast on `cap`.
- **Components**: new `components/HelpTip.tsx` + `components/HelpTip.module.css`.
- **Pages**: `app/(root)/habits/new/page.tsx` — cap-aware submit + cap message + `HelpTip`,
  with a colocated `page.module.css` addition for the cap banner.
- **Tests**: repo cap logic, action result shape, store rollback, new-habit cap UX, and the
  `HelpTip` component; plus updates to existing tests affected by the new result shape.
- **Docs**: `README.md` and `AGENTS.md` note the habit cap behaviour and the `HelpTip` control.
- **No schema/migration change** — the cap is derived entirely from existing columns
  (`Habit.archivedAt` + `FormationVerdict.decision`).
