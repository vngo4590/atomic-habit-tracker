## ADDED Requirements

### Requirement: Today screen groups habits by time of day
The system SHALL group habits into Morning, Afternoon, and Evening sections based on each habit's `time` field. Only non-empty groups are rendered.

#### Scenario: Habits with Morning time appear in Morning section
- **WHEN** the Today screen renders
- **THEN** all habits with `time === 'Morning'` appear under the "Morning" section header

### Requirement: Completion ring shows percentage done today
The system SHALL display an SVG ring with the ratio of habits completed today, as a percentage integer (0–100).

#### Scenario: Ring updates when a habit is checked
- **WHEN** the user checks a habit done
- **THEN** the ring's arc and percentage text update to reflect the new completion count

### Requirement: 14-day sparkline shows daily completion trend
The system SHALL render a bar chart of the last 14 days, with each bar's height proportional to the fraction of habits done that day. Today's bar is accented; others use ink shades.

#### Scenario: Sparkline has 14 bars
- **WHEN** the Today screen renders
- **THEN** exactly 14 bars are visible

### Requirement: Identity vote panel shows today's votes by identity
The system SHALL display a list of identity strings with their vote count for the current day, derived from which habits were checked done today.

#### Scenario: No votes shows placeholder text
- **WHEN** no habits are done today
- **THEN** the panel shows an italic placeholder "No votes cast yet"

#### Scenario: Vote count increments on check-in
- **WHEN** the user checks a habit with `identity: 'reader'`
- **THEN** the panel shows "I am reader · +1"

### Requirement: Mood check-in sheet opens after checking a habit
The system SHALL open a modal overlay after a habit is checked done, allowing the user to rate their mood (1–5) and optionally write a journal note. The user can dismiss it to skip.

#### Scenario: Sheet opens on check
- **WHEN** the user checks an unchecked habit on the Today screen
- **THEN** the MoodCheckSheet modal opens for that habit

#### Scenario: Skipping saves only the done state
- **WHEN** the user clicks "Skip — just mark it done"
- **THEN** the modal closes and the habit remains checked with no mood/journal data

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
