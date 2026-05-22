## ADDED Requirements

### Requirement: Habit detail page has a Stack tab
The system SHALL render six tabs for each habit: Overview, Loop, Journal, History, Notes, and Stack. The Stack tab is positioned after Notes.

#### Scenario: Stack tab is visible on habit detail
- **WHEN** the user navigates to `/habits/[id]`
- **THEN** the Stack tab appears in the tab bar

#### Scenario: Clicking Stack tab shows the stack diagram
- **WHEN** the user clicks the "Stack" tab
- **THEN** the stack diagram replaces the previous tab content

### Requirement: Stack tab renders a linked-list diagram of the chain
The system SHALL display the habits in the current habit's stack chain as a horizontal sequence of cards with connecting arrows. The current habit SHALL be visually highlighted. The diagram SHALL show the habit's position in the chain (e.g., "Step 2 of 4").

#### Scenario: Stack diagram shows the full chain
- **WHEN** the Stack tab is active for habit B in chain A → B → C
- **THEN** the diagram shows three cards in order: A, B (highlighted), C with arrows between them

#### Scenario: Solo habit shows empty stack state
- **WHEN** the Stack tab is active for a habit with no `stackNextId` and no predecessor
- **THEN** an empty state message appears: "This habit is not part of a stack. Link it to another habit to build a chain."

### Requirement: Stack tab allows linking and unlinking habits
The system SHALL provide controls to link the current habit before or after another habit, and to remove it from its current stack. Circular dependencies and multi-stack membership SHALL be blocked with inline error messages.

#### Scenario: Linking after another habit updates the chain
- **WHEN** the user selects "Link after" and chooses habit X
- **THEN** the current habit's `stackNextId` is updated and the diagram re-renders

#### Scenario: Unlinking removes the habit from the chain
- **WHEN** the user clicks "Remove from stack"
- **THEN** the current habit's `stackNextId` becomes `null` and its predecessor (if any) is re-linked to its former successor

#### Scenario: Attempting a circular link shows inline error
- **WHEN** the user attempts a link that would create a cycle
- **THEN** an inline error message appears and the link is not saved
