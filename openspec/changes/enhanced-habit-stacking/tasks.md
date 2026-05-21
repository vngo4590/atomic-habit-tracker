## 1. Data Model & Backend

- [x] 1.1 Add `stackNextId` to Prisma schema as nullable self-referencing foreign key on `Habit`
- [x] 1.2 Generate and apply Prisma migration
- [x] 1.3 Update `Habit` TypeScript type to include `stackNextId: string | null`
- [x] 1.4 Add server-side exclusivity validation in habit update action
- [x] 1.5 Add server-side cycle detection in habit update action
- [x] 1.6 Update habit repository to handle `stackNextId` on create and update
- [x] 1.7 Update API routes to reject invalid stack links with clear error messages

## 2. Stack Logic Helpers

- [x] 2.1 Create `lib/stack.ts` with `getStackChain`, `getStackRoot`, `getSuccessor`
- [x] 2.2 Implement `wouldCreateCycle` with direct and indirect cycle detection
- [x] 2.3 Implement `stackInsertPatches` for before/after insertion
- [x] 2.4 Implement `stackRemovePatches` for unlinking and neighbor re-linking
- [x] 2.5 Implement `getVisibleStackHabit` for Today page first-undone logic
- [x] 2.6 Implement `groupHabitsByStack` for grouping habits by root
- [x] 2.7 Write unit tests for all stack helpers in `lib/__tests__/stack.test.ts`

## 3. Habit Detail Stack Tab

- [x] 3.1 Add "Stack" as the sixth tab in the habit detail page
- [x] 3.2 Create `StackDiagram` component showing horizontal chain with arrows
- [x] 3.3 Highlight the current habit in the diagram and show position label
- [x] 3.4 Build empty state UI for habits not in a stack
- [x] 3.5 Add "Link after" / "Link before" controls with habit selector
- [x] 3.6 Add "Remove from stack" control with confirmation
- [x] 3.7 Wire up inline error messages for exclusivity and cycle violations
- [x] 3.8 Write component tests for `StackDiagram` in `components/__tests__/StackDiagram.test.tsx`

## 4. Today Page Stack Cards

- [x] 4.1 Create `StackCardGroup` component with wallet-style stacked visual
- [x] 4.2 Implement expand/collapse interaction with Framer Motion
- [x] 4.3 Show up to next 2 habits on expand with "+N more" overflow indicator
- [x] 4.4 Integrate `StackCardGroup` into Today page habit list
- [x] 4.5 Ensure solo habits still render as standalone cards
- [x] 4.6 Verify responsive layout at 375px width with no overflow or clipping
- [x] 4.7 Write component tests for `StackCardGroup` in `components/__tests__/StackCardGroup.test.tsx`

## 5. UI Testing Framework

- [x] 5.1 Install `@playwright/test` and add `playwright.config.ts`
- [x] 5.2 Add `test:e2e` script to `package.json`
- [x] 5.3 Create `e2e/` directory with basic auth fixture and page objects
- [x] 5.4 Write E2E test: create habits, link them, verify Stack tab diagram
- [x] 5.5 Write E2E test: attempt invalid stack link and verify error message
- [x] 5.6 Write E2E test: expand/collapse stack card group on Today page
- [x] 5.7 Write E2E test: verify no layout overflow at mobile viewport
- [x] 5.8 Add Playwright step to CI workflow

## 6. Integration & Validation

- [x] 6.1 Run full Vitest suite and ensure no regressions
- [x] 6.2 Run `npm run typecheck` and fix any TypeScript errors
- [x] 6.3 Run `npm run lint:app` and fix any lint errors
- [x] 6.4 Run `npm run build` and verify production build succeeds
- [x] 6.5 Run Playwright E2E suite and verify all pass
- [x] 6.6 Update `AGENTS.md` if any conventions or patterns changed
