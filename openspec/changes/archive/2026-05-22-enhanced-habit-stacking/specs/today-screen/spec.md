## ADDED Requirements

### Requirement: Stacked habits render as a wallet-style card group on the Today page
The system SHALL detect habits that belong to a stack chain and render them as a visually grouped stack of cards. The group SHALL use progressive vertical offsets and slight scale reduction to simulate depth. Only habits scheduled for today and not yet done SHALL appear.

#### Scenario: Stack group renders with first undone habit on top
- **WHEN** a stack chain has habits A (done), B (not done), C (not done) and B and C are scheduled for today
- **THEN** the Today page shows a stack card group with B visible on top and C peeking behind it

#### Scenario: Solo habits render as normal cards
- **WHEN** a habit has no stack links
- **THEN** it renders as a standalone habit card, unchanged from current behavior

### Requirement: Tapping a stack card group expands to reveal the next habits
The system SHALL allow the user to tap a stack card group to expand it. The expanded view SHALL reveal up to the next 2 habits in the chain. If more habits remain, an overflow indicator SHALL display the count of remaining habits (e.g., "+3 more").

#### Scenario: Expand reveals next two habits
- **WHEN** the user taps a stack group containing habits B, C, D, E
- **THEN** the group expands to show B, C, and D with an indicator "+1 more" for E

#### Scenario: Collapse returns to stacked view
- **WHEN** the user taps the expanded group again or taps a collapse affordance
- **THEN** the group returns to its compact stacked state

### Requirement: Stack card group layout does not overflow or break
The system SHALL ensure the stack card group fits within the viewport without horizontal overflow. Cards SHALL wrap or scale appropriately on narrow screens. No content SHALL be clipped or overlap outside the card boundaries.

#### Scenario: Stack group on narrow mobile viewport
- **WHEN** the Today page renders on a 375px-wide viewport
- **THEN** stack cards are fully visible with no horizontal overflow, clipping, or broken margins

#### Scenario: Stack group with long habit names
- **WHEN** a habit name exceeds the card width
- **THEN** the text wraps or truncates with ellipsis without breaking the card layout
