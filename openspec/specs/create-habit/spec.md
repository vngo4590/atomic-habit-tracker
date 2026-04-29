# create-habit Specification

## Purpose
TBD - created by archiving change port-reference-ui. Update Purpose after archive.
## Requirements
### Requirement: New habit is created via a Mad-Libs sentence builder
The system SHALL render a sentence "I will [name], [time] [location], so I can become [identity]." with inline inputs embedded in the text. The Create button is disabled until `name` and `identity` are filled.

#### Scenario: Create button is disabled with empty name
- **WHEN** the name field is empty
- **THEN** the Create habit button is disabled

#### Scenario: Submitting the form adds the habit and navigates away
- **WHEN** the user fills name + identity and clicks Create
- **THEN** `addHabit(finalized)` is called and the user is redirected to `/habits`

### Requirement: Schedule picker supports presets and custom day selection
The system SHALL provide Every day, Weekdays, Weekends, 3× a week, and Custom presets. In Custom mode, individual day-of-week buttons toggle on/off.

#### Scenario: Selecting a preset activates the matching day buttons
- **WHEN** the user selects "Weekdays"
- **THEN** Mon–Fri day buttons are highlighted; Sat–Sun are not

#### Scenario: Clicking a day button in Custom mode toggles it
- **WHEN** the user selects Custom and clicks Wednesday
- **THEN** Wednesday is removed from or added to `customDays`

### Requirement: Existing identities are shown for reuse
The system SHALL display pill buttons for every unique identity string already in the store. Clicking one populates the identity field.

#### Scenario: Clicking an existing identity sets the field
- **WHEN** the user clicks an identity pill
- **THEN** the identity inline input updates to that identity string

### Requirement: Habit stacking is optionally configured
The system SHALL offer a collapsible "Stack onto an existing habit" section with a text input ("After I ___") and a quick-pick dropdown of existing habits.

#### Scenario: Stack field is hidden by default
- **WHEN** the create screen renders
- **THEN** the stack text input is not visible until the user clicks "+ Add"

#### Scenario: Selecting an existing habit populates the stack field
- **WHEN** the user selects a habit from the quick-pick dropdown
- **THEN** the stack input is filled with that habit's name in lowercase

