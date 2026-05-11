## ADDED Requirements

### Requirement: Journal entries are persisted per user
The system SHALL let authenticated users create and list their own journal entries.

#### Scenario: User saves journal entry
- **WHEN** an authenticated user saves a journal entry
- **THEN** the system persists it and returns it in that user's newest-first journal list

### Requirement: Weekly reviews are persisted per user
The system SHALL let authenticated users save weekly review answers and reload them later.

#### Scenario: User saves weekly review
- **WHEN** an authenticated user saves review responses for a week
- **THEN** the system persists the responses for that user and week

### Requirement: Lesson progress is persisted per user
The system SHALL store completed lessons and lesson selection mode for each authenticated user.

#### Scenario: User completes a lesson
- **WHEN** a user marks a lesson read
- **THEN** the lesson remains complete after logout and login

### Requirement: Identity data is persisted per user
The system SHALL persist identity statement, core values, and identity vote calculations for the authenticated user.

#### Scenario: User edits identity statement
- **WHEN** a user updates the identity statement
- **THEN** the system persists the new statement for that user

### Requirement: Hall of Fame verdicts are persisted per user
The system SHALL store formation review verdicts and show inducted habits for the authenticated user.

#### Scenario: User inducts a formed habit
- **WHEN** a user completes the formation questionnaire and inducts a habit
- **THEN** the habit appears in that user's Hall of Fame after refresh
