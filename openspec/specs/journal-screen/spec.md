# journal-screen Specification

## Purpose
TBD - created by archiving change port-reference-ui. Update Purpose after archive.
## Requirements
### Requirement: Journal screen shows a list of entries and a compose UI
The system SHALL display all journal entries in reverse-chronological order. A "New entry" button opens an inline compose form above the list.

#### Scenario: Entries are shown newest-first
- **WHEN** the Journal screen renders with multiple entries
- **THEN** the most recent entry appears at the top of the list

#### Scenario: New entry button opens compose form
- **WHEN** the user clicks "New entry"
- **THEN** a title input, body textarea, and mood selector appear above the entry list

### Requirement: Journal entries have a title, body, and mood tag
The system SHALL require a title to enable saving. Mood options are "Good day", "So-so", and "Hard". Tags array is stored but tag input is optional.

#### Scenario: Save is disabled without a title
- **WHEN** the title field is empty
- **THEN** the "Save entry" button is disabled

#### Scenario: Saving an entry adds it to the store and closes the form
- **WHEN** the user fills a title and clicks Save
- **THEN** the entry appears at the top of the list and the compose form closes

### Requirement: Three reflection prompts are shown when not composing
The system SHALL display three clickable prompt cards when the compose form is closed. Clicking a prompt opens the compose form with the prompt text pre-filled as the title.

#### Scenario: Clicking a prompt pre-fills the title
- **WHEN** the user clicks "What habit felt automatic today?"
- **THEN** the compose form opens with that text as the title value

