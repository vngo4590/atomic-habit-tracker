## 1. Data Model & Backend

- [ ] 1.1 Add `stackNextId` to Prisma schema as nullable self-referencing foreign key on `Habit`
- [ ] 1.2 Generate and apply Prisma migration
- [ ] 1.3 Update `Habit` TypeScript type to include `stackNextId: string | null`
- [ ] 1.4 Add server-side exclusivity validation in habit update action
- [ ] 1.5 Add server-side cycle detection in habit update action
- [ ] 1.6 Update habit repository to handle `stackNextId` on create and update
- [ ] 1.7 Update API routes to reject invalid stack links with clear error messages

## 2. Stack Logic Helpers

- [ ] 2.1 Create `lib/stack.ts` with `getStackChain`, `getStackRoot`, `getSuccessor`
- [ ] 2.2 Implement `wouldCreateCycle` with direct and indirect cycle detection
- [ ] 2.3 Implement `stackInsertPatches` for before/after insertion
- [ ] 2.4 Implement `stackRemovePatches` for unlinking and neighbor re-linking
- [ ] 2.5 Implement `getVisibleStackHabit` for Today page first-undone logic
- [ ] 2.6 Implement `groupHabitsByStack` for grouping habits by root
- [ ] 2.7 Write unit tests for all stack helpers in `lib/__tests__/stack.test.ts`

## 3. Habit Detail Stack Tab

- [ ] 3.1 Add "Stack" as the sixth tab in the habit detail page
- [ ] 3.2 Create `StackDiagram` component showing horizontal chain with arrows
- [ ] 3.3 Highlight the current habit in the diagram and show position label
- [ ] 3.4 Build empty state UI for habits not in a stack
- [ ] 3.5 Add "Link after" / "Link before" controls with habit selector
- [ ] 3.6 Add "Remove from stack" control with confirmation
- [ ] 3.7 Wire up inline error messages for exclusivity and cycle violations
- [ ] 3.8 Write component tests for `StackDiagram` in `components/__tests__/StackDiagram.test.tsx`

## 4. Today Page Stack Cards

- [ ] 4.1 Create `StackCardGroup` component with wallet-style stacked visual
- [ ] 4.2 Implement expand/collapse interaction with Framer Motion
- [ ] 4.3 Show up to next 2 habits on expand with "+N more" overflow indicator
- [ ] 4.4 Integrate `StackCardGroup` into Today page habit list
- [ ] 4.5 Ensure solo habits still render as standalone cards
- [ ] 4.6 Verify responsive layout at 375px width with no overflow or clipping
- [ ] 4.7 Write component tests for `StackCardGroup` in `components/__tests__/StackCardGroup.test.tsx`

## 5. UI Testing Framework

- [ ] 5.1 Install `@playwright/test` and add `playwright.config.ts`
- [ ] 5.2 Add `test:e2e` script to `package.json`
- [ ] 5.3 Create `e2e/` directory with basic auth fixture and page objects
- [ ] 5.4 Write E2E test: create habits, link them, verify Stack tab diagram
- [ ] 5.5 Write E2E test: attempt invalid stack link and verify error message
- [ ] 5.6 Write E2E test: expand/collapse stack card group on Today page
- [ ] 5.7 Write E2E test: verify no layout overflow at mobile viewport
- [ ] 5.8 Add Playwright step to CI workflow

## 6. Integration & Validation

- [ ] 6.1 Run full Vitest suite and ensure no regressions
- [ ] 6.2 Run `npm run typecheck` and fix any TypeScript errors
- [ ] 6.3 Run `npm run lint:app` and fix any lint errors
- [ ] 6.4 Run `npm run build` and verify production build succeeds
- [ ] 6.5 Run Playwright E2E suite and verify all pass
- [ ] 6.6 Update `AGENTS.md` if any conventions or patterns changed
