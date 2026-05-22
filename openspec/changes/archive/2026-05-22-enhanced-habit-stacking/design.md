## Context

The app currently stores a `stack` string on each habit record (mentioned in the habit-store spec) but stacking is not implemented in the Prisma schema, types, or UI. The reference_ui contained a stack concept, but the port never wired it up. Users need a visual, interactive way to build habit chains and see them on both the detail page and the Today screen.

The Today page currently shows habits scheduled for today that are not yet done, with no grouping. The habit detail page has five tabs (Overview, Loop, Journal, History, Notes) and no Stack visualization.

## Goals / Non-Goals

**Goals:**
- Replace the unused `stack` string with a proper singly-linked list (`stackNextId`).
- Enforce that a habit can belong to at most one stack chain at a time (exclusivity).
- Provide a Stack tab on the habit detail page showing the habit's chain and its position.
- Render stack chains on the Today page as an Apple Wallet-style card group with expand/collapse.
- Add Playwright-based end-to-end tests for stack CRUD and UI interactions.
- Write unit and component tests for stack logic and exclusivity validation.

**Non-Goals:**
- Multiple outgoing stack links per habit (it is strictly a singly-linked list).
- Branching stacks or stack trees.
- Stack scheduling (stacks inherit the individual habit schedules).
- Drag-and-drop reordering of stacks (use explicit before/after selectors).
- Migration of old `stack` string data (it was never populated).

## Decisions

### 1. Singly-linked list via `stackNextId`
**Decision:** Each habit has an optional `stackNextId` pointing to the next habit in the chain.
**Rationale:** Simple to validate, simple to traverse, matches the user's "linked list with next node" requirement. A doubly-linked list adds complexity without benefit since we always traverse from the root.
**Alternative considered:** Array of IDs on a habit (`stack: string[]`) — rejected because moving a habit requires updating N records instead of 2.

### 2. Exclusivity enforced at the application layer
**Decision:** Before linking habit A → B, verify no other habit already points to B. Reject with a clear error message.
**Rationale:** Prisma self-relations with unique constraints on the "pointed-to" side are awkward (would require a separate `stackPrevId` or junction table). Application-level validation is explicit and gives us better error messages.
**Alternative considered:** Junction table `StackMember(habitId, position, stackId)` — rejected as overkill for a simple linked list.

### 3. Stack visualization is read-only on the detail page
**Decision:** The Stack tab shows a diagram of the chain. Editing (insert before/after, remove) is done via inline controls in that tab, not in a separate modal.
**Rationale:** Keeps the user in context. The diagram itself can contain the edit affordances.

### 4. Today-page stacks use CSS transforms for the wallet effect
**Decision:** Use stacked `position: absolute` cards with progressive `translateY` offsets and slight scale reduction to simulate depth. Clicking expands with Framer Motion layout animations.
**Rationale:** Framer Motion is already the project's animation library. CSS transforms are GPU-accelerated and avoid layout thrashing.
**Alternative considered:** 3D CSS transforms (`rotateX`, `perspective`) — rejected because they can look gimmicky and hurt accessibility.

### 5. Playwright for E2E, existing Vitest + Testing Library for unit/component
**Decision:** Add Playwright for end-to-end flows. Keep Vitest for unit/component tests.
**Rationale:** The project already has a strong Vitest setup. Playwright gives us real browser coverage for the stack card interactions (hover, tap, expand) that are hard to test in jsdom.
**Alternative considered:** Cypress — rejected because Playwright is faster, has better TypeScript support, and is the modern default.

## Risks / Trade-offs

- **[Risk]** Playwright adds CI time (~1-2 min) and a new dev dependency.
  → **Mitigation:** Run Playwright only on PRs, not every commit. Use `test:unit` and `test:e2e` script separation.
- **[Risk]** Stack card animations could cause layout shifts on mobile if not carefully measured.
  → **Mitigation:** Use `transform` only (no `width`/`height` animations). Cap the visible expanded count at 3 cards. Test on the smallest supported viewport.
- **[Risk]** Circular stack references could be introduced if validation is bypassed.
  → **Mitigation:** Validate cycles on both client (`wouldCreateCycle`) and server (Prisma transaction check). Treat `stackNextId` as an immutable reference once set unless explicitly unlinked.

## Migration Plan

1. Prisma migration adds `stackNextId` to the `Habit` table (nullable string, foreign key to `Habit.id`, `ON DELETE SET NULL`).
2. Deploy migration.
3. Merge UI changes (habit detail Stack tab, Today page card groups).
4. Add Playwright to CI workflow.
5. Rollback: revert migration (drop column) and revert commit.

## Open Questions

- Should deleting a habit automatically re-link its predecessor to its successor? **Proposed: yes** — otherwise the chain breaks silently.
- Should the Stack tab allow creating a stack from scratch, or only editing an existing one? **Proposed: both** — an empty state with "Link to another habit" CTA.
