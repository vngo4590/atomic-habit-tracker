## ADDED Requirements

### Requirement: Habit detail has six tabs: Overview, Loop, Journal, History, Notes, Stack
The system SHALL render six tabs for each habit. Tabs switch the content area without navigating away.

#### Scenario: Default tab is Overview
- **WHEN** the user navigates to `/habits/[id]`
- **THEN** the Overview tab is active

#### Scenario: Clicking the Loop tab switches content
- **WHEN** the user clicks the "Loop" tab
- **THEN** the loop diagram replaces the overview content

#### Scenario: Clicking the Stack tab switches content
- **WHEN** the user clicks the "Stack" tab
- **THEN** the stack diagram replaces the previous tab content

### Requirement: Overview tab shows the four laws with inline editing
The system SHALL display Cue, Craving, Response, and Reward fields. Clicking any field opens an inline textarea editor. Saving calls `updateHabit`.

#### Scenario: Clicking a law field activates inline edit mode
- **WHEN** the user clicks the "Make it obvious" cue field
- **THEN** a textarea with the current value and Save/Cancel buttons appears

#### Scenario: Saving an edit persists to the store
- **WHEN** the user edits a field and clicks Save
- **THEN** the habit in the store is updated and the new value renders

### Requirement: Loop tab shows the four-step habit loop diagram
The system SHALL render a four-cell grid (Cue, Craving, Response, Reward) with connecting arrows and a "loop in a sentence" paragraph at the bottom.

#### Scenario: Loop cells display the habit's actual values
- **WHEN** the Loop tab is active
- **THEN** the four cells show the habit's `cue`, `craving`, `response`, and `reward` fields respectively

### Requirement: History tab shows a 26-week dot wall
The system SHALL render a 26×7 grid of day dots. Done days are filled with accent color. Clicking a dot toggles that day's completion. Today's dot has a ring outline.

#### Scenario: Done days render as filled dots
- **WHEN** the History tab renders
- **THEN** dates present in `habit.history` appear as filled (accent-colored) dots

#### Scenario: Clicking a dot toggles that day
- **WHEN** the user clicks a dot for a past date
- **THEN** `toggleHabit(id, dateKey)` is called for that date

### Requirement: Notes tab allows adding and deleting free-text notes
The system SHALL render a textarea composer and a list of timestamped notes. Notes can be deleted individually or in bulk via a select mode.

#### Scenario: Adding a note saves it to the habit
- **WHEN** the user types in the notes composer and clicks "Add note"
- **THEN** the note appears at the top of the list with today's date

#### Scenario: Bulk delete removes selected notes
- **WHEN** the user enters select mode, selects two notes, and clicks Delete
- **THEN** both notes are removed from the habit

### Requirement: Mark done button on habit detail opens mood sheet
The system SHALL show a "Mark done" / "Done today · edit" button at the top of the detail screen. Clicking it calls `toggleHabit` (if not done) and opens the MoodCheckSheet.

#### Scenario: Undone habit shows "Mark done"
- **WHEN** the habit is not done today
- **THEN** the button reads "Mark done"

#### Scenario: Clicking Mark done checks habit and opens mood sheet
- **WHEN** the user clicks "Mark done"
- **THEN** the habit is toggled done and the MoodCheckSheet opens

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
