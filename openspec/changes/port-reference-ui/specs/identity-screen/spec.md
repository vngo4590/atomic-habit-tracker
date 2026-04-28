## ADDED Requirements

### Requirement: Identity screen shows an editable identity statement
The system SHALL render the user's identity statement as an editable textarea. Changes SHALL be saved to the store immediately on input (controlled component).

#### Scenario: Identity statement is editable inline
- **WHEN** the user clicks into the identity statement textarea and types
- **THEN** the store's `identity.statement` updates on each keystroke

### Requirement: Core values are displayed as chips with an add option
The system SHALL render each value in `identity.values` as an accent chip. A dashed "+ Add value" chip SHALL be present for adding new values.

#### Scenario: Existing values render as accent chips
- **WHEN** the identity screen renders with values ["Curious", "Calm"]
- **THEN** two chips labeled "Curious" and "Calm" are visible

### Requirement: Vote ledger tallies all-time check-ins per identity
The system SHALL count the total entries in `habit.history` for each unique identity value across all habits and display them as bars ranked by vote count.

#### Scenario: Identity with most votes appears at the top
- **WHEN** "reader" has 78 total check-ins and "calm" has 45
- **THEN** "reader" appears first with the tallest bar

#### Scenario: All-time total is shown in the header
- **WHEN** the vote ledger renders
- **THEN** "X TOTAL" shows the sum of all identity votes across all habits
