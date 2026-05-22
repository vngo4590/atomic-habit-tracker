## ADDED Requirements

### Requirement: Playwright is installed and configured for end-to-end testing
The system SHALL include `@playwright/test` as a dev dependency with a `playwright.config.ts` configured for the Next.js dev server. The config SHALL target Chromium, Firefox, and WebKit with a base URL of `http://localhost:3000`.

#### Scenario: Playwright runs against the dev server
- **WHEN** `npm run test:e2e` is executed
- **THEN** Playwright starts the Next.js dev server, runs all spec files under `e2e/`, and shuts down the server

### Requirement: E2E tests cover stack CRUD flows
The system SHALL include Playwright tests that create habits, link them into a stack, verify the stack diagram on the detail page, and verify the wallet-style card group on the Today page.

#### Scenario: Creating a stack and viewing it on the detail page
- **WHEN** the user creates two habits and links the first after the second
- **THEN** the Stack tab on the detail page shows both habits in order with the correct highlight

#### Scenario: Stack exclusivity is enforced in the UI
- **WHEN** the user attempts to link a habit that is already in another stack
- **THEN** an error message appears and the link is not created

### Requirement: E2E tests cover Today page stack interactions
The system SHALL include Playwright tests that verify the expand/collapse behavior of stack card groups and confirm no layout overflow occurs.

#### Scenario: Expanding a stack card group reveals more habits
- **WHEN** the user taps a stack card group on the Today page
- **THEN** the group expands and shows the next habits in the chain

#### Scenario: Stack cards do not overflow on mobile viewport
- **WHEN** the page is rendered at 375px width
- **THEN** all stack card content is visible without horizontal scroll or clipped text

### Requirement: Unit and component tests cover stack logic
The system SHALL include Vitest tests for `lib/stack.ts` helpers and component tests for `StackDiagram` and `StackCardGroup`.

#### Scenario: wouldCreateCycle detects direct and indirect cycles
- **WHEN** `wouldCreateCycle` is called with cycle-inducing arguments
- **THEN** it returns `true`

#### Scenario: getVisibleStackHabit returns the first undone habit
- **WHEN** a stack chain has mixed done/undone habits
- **THEN** `getVisibleStackHabit` returns the first undone habit from the root

#### Scenario: StackDiagram renders the correct number of cards
- **WHEN** `StackDiagram` is rendered with a chain of 4 habits
- **THEN** exactly 4 habit cards are visible in the diagram
