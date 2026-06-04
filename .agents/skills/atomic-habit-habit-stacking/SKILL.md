---
name: atomic-habit-habit-stacking
description: Data model, helpers, mutation API, and UI behaviour for Atomicly habit stacks (the self-referencing `stackNextId` linked list). Use when touching `lib/stack.ts`, `lib/stack-errors.ts`, `applyStackMutationAction`, the Today-page `StackCardGroup`, or the habit-detail `StackDiagram`. Source of truth for cycle-safety, exclusivity, picker semantics, and `StackError` codes.
---

# Atomicly Habit Stacking

> **TL;DR:** Habit stacks are a linked list via `Habit.stackNextId`. Exclusivity is a unique DB constraint. Cycles are validated in the repository. All mutations go through `applyStackMutationAction` and surface `StackError`s as modals.

## 1. Data model rules

- `habit.stackNextId` is a nullable foreign key pointing to the next habit in the chain.
- **Exclusivity (`@unique`)**: at most one habit may link to any given habit. The DB enforces this as a unique constraint on `stackNextId`.
- **No cycles**: validation in `lib/repositories/habits.ts::validateStackLink` (called by both `updateHabit` and `applyStackMutation`) rejects any link that would form a cycle (direct or indirect).
- **Symmetric "Link before / Link after" picker** with chain-gravity:
  - **Anchor in a chain**: picker offers only **standalone** habits; the picked solo is inserted before/after the anchor inside the existing chain.
  - **Anchor is solo**: picker offers **every other habit** (chain members and other solos).
    - If the picked is in a chain, the current solo joins that chain at the picked position (current → picked's chain).
    - If the picked is also solo, the natural reading applies — picked is inserted before/after the anchor (forming a new 2-chain anchored on current).
  - Server-side rule: the inserted habit (`habitId`) must be solo. Concretely, when the picked habit lives in a chain, `habitId = current, targetId = picked`; otherwise `habitId = picked, targetId = current`.
  - To move a habit already in a chain, first remove it from its stack to make it standalone again.
- All stack-mutation errors are thrown as `StackError` (`lib/stack-errors.ts`) with a stable `code` (`self_reference` | `circular_stack` | `target_in_other_stack` | `source_in_other_stack` | `habit_not_found` | `target_not_found` | `invalid_reorder`) and a friendly message used directly in UI modals.

## 2. Core helpers (`lib/stack.ts`)

- `getStackRoot(habit, habits)` — iterative + visited-set so corrupted/cyclic data is safe; returns the chain head.
- `getStackChain(habit, habits)` — full ordered chain root → tail.
- `getChainFrom(habit, habits)` — forward sub-chain starting at the given habit (used by `StackCardGroup` to render from the visible top, not the chain root).
- `getSuccessor` / `getPredecessor` — neighbor lookups.
- `isInStack(habit, habits)` — true if the habit has a successor *or* is the successor of another habit.
- `wouldCreateCycle(sourceId, targetId, habits)` — projects a `source → target` link and walks forward to detect closure.
- `stackInsertPatches(habitId, position, targetId, habits)` / `stackRemovePatches(habitId, habits)` / `stackReorderPatches(habitIds)` — return **ordered** `{ id, patch }` lists that never violate the `stackNextId @unique` constraint between intermediate states. `stackReorderPatches` uses a two-phase **null-then-link** pattern: first null every chain member's pointer, then write the new links in order.
- `getVisibleStackHabit(habits, dateKey)` — first undone habit per chain for the Today screen.
- `groupHabitsByStack(habits)` — root-keyed groups in chain order.

## 3. Mutation API

- **`applyStackMutationAction({ kind: "insert", habitId, position, targetId } | { kind: "remove", habitId } | { kind: "reorder", habitIds })`** in `lib/actions/domain.ts` is the canonical entry point for any stack change.
- Internally calls `applyStackMutation` in `lib/repositories/habits.ts`, which runs inside `db.$transaction`:
  1. Loads the user's habit graph.
  2. Validates per-kind: insert (source is solo, target exists, no self-reference, no cycle), remove (habit exists), reorder (`habitIds` set equals the current chain set rooted at any one of them — no merging chains, no add/drop members via reorder; duplicates rejected).
  3. Applies ordered patches via `tx.habit.update`.
  4. Returns the post-mutation affected habits.
- The store exposes `store.applyStackMutation(input)` which optimistically applies the patches, awaits the server response, overlays the returned habits, and rolls back the optimistic state on rejection. UI callers (`StackDiagram`) surface the rejected error message in a `Modal`.
- `updateHabit` in the repository (and therefore the action and `/api/v1/habits/[id]` PATCH) inherits stack-link validation when `stackNextId` is part of the patch. PATCH maps `StackError` to a 422 with `{ error: { code, message } }` via `handleHabitMutationError`.

## 4. UI surfaces

### Today (`/`) — `StackCardGroup`

- **Collapsed**: always shows the **top card** plus up to **2 peek slivers** behind it so the user immediately sees a stack exists.
- **Expanded**: top card + up to **2 upcoming** undone cards, plus a `+N more` indicator where N **excludes the already-displayed cards**.
- `getChainFrom(habit, habits)` walks forward from the passed habit (the first-undone in the chain), so a partially-checked chain shows from the correct sub-chain.
- Already-done upcoming habits are filtered out so the wallet only surfaces habits still to be fulfilled today.

### Habit detail (`/habits/[id]`) — `StackDiagram` (Stack tab)

- **Clickable chips**: each chain chip is a navigation button — clicking a non-current chip calls `useRouter().push("/habits/<id>")`. Because we don't replace history, the back button (`router.back()`) walks back through visited chain habits in reverse order. The current habit's own chip is a no-op.
- **Per-chip × button**: an X next to each chip calls `store.applyStackMutation({ kind: "remove", habitId: <chipId> })` to unlink only that node. Server-side `stackRemovePatches` heals the chain by re-linking the predecessor to the former successor. The X stops click + pointerdown propagation so it never starts a drag or triggers navigation.
- **Drag-to-reorder**: chips are rendered inside a Framer Motion `Reorder.Group axis="x"` with a `Reorder.Item` per chip. On `onDragEnd` the local chain order is committed via `store.applyStackMutation({ kind: "reorder", habitIds: [...] })`. A `wasDraggedRef` suppresses chip-click navigation that would otherwise fire right after a drag.
- **Symmetric picker** (see § 1 above for semantics). The picker is capped at the first **10** results by default; for larger pools the user either refines via the search input (name / identity / cue) or clicks **"Show all N habits"** to expand. Searching always resets back to the focused capped view. The cap lives in `STACK_PICKER_DEFAULT_LIMIT` exported from `components/StackDiagram.tsx`.
- **Search input** filters the selector by name / identity / cue.
- Errors from the server (cycle, exclusivity, invalid reorder, etc.) open a **`Modal`** with the server message and an OK button; the operation is cancelled and the optimistic patch is rolled back.

### Modal vs Toast

- Use `components/Modal.tsx` for stack-mutation errors and any other failure the user must acknowledge before continuing.
- Toasts auto-dismiss in ~2.4s and are unsuitable for cancellation messages.

## See Also

- `atomic-habit-architecture` — where these files sit
- `atomic-habit-schedule-metrics` — interacts with stacking on the Today page
- `atomic-habit-ui-animation` — `Reorder.Group` and modal/overlay animation patterns
- `atomic-habit-test-edge-cases` — cycle / exclusivity / self-reference scenarios
