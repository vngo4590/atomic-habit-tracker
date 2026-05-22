## Why

Habit stacking is a core Atomic Habits technique, but the current app only stores a `stack` string field without enforcing rules or visualizing chains. Users need to see their habit stacks as linked sequences, understand ordering, and interact with stacks intuitively on the Today screen.

## What Changes

- **Data model**: Replace the flat `stack` string with a proper linked-list structure using a `stackNextId` reference. Enforce exclusivity — a habit can belong to at most one stack at a time.
- **Habit detail page**: Add a "Stack" tab that renders a visual diagram of the habit's chain and its position within it.
- **Today page**: Render stacked habits as an Apple Wallet-style card stack. Tapping expands to reveal the next habits in the chain, with an overflow indicator for remaining habits.
- **Testing**: Introduce Playwright for end-to-end UI testing and write comprehensive tests covering stack CRUD, exclusivity validation, and the Today-page card stack interactions.

## Capabilities

### New Capabilities
- `habit-stack-model`: Linked-list stack data model with exclusivity constraints and cycle prevention.
- `habit-stack-visualization`: Stack diagram tab on the habit detail page showing chain order.
- `today-stack-cards`: Wallet-style stacked card UI on the Today page with expand/collapse behavior.
- `ui-testing-framework`: Playwright-based end-to-end UI testing setup and conventions.

### Modified Capabilities
- `habit-store`: Add stack-linked-list helpers (`getStackChain`, `getStackRoot`, `wouldCreateCycle`, `stackInsertPatches`, `stackRemovePatches`, `getVisibleStackHabit`, `groupHabitsByStack`).
- `habit-detail`: Add the Stack tab to the habit detail page.
- `today-screen`: Integrate stack card groups into the Today page habit list.

## Impact

- **Database**: Prisma schema migration to add `stackNextId` (nullable string, self-referencing foreign key) and unique constraint to enforce single-stack membership.
- **API**: New validation in habit update endpoints to prevent circular stack references and multi-stack membership.
- **Frontend**: New `StackDiagram` component, `StackCardGroup` component for Today page, and Playwright test suite.
- **Dependencies**: Add `@playwright/test` as a dev dependency.
