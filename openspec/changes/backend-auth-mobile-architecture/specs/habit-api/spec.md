## ADDED Requirements

### Requirement: Habit queries return only authenticated user data
The system SHALL provide server-side habit list and detail queries scoped to the active user.

#### Scenario: User opens habit list
- **WHEN** an authenticated user opens `/habits`
- **THEN** the system loads only habits owned by that user

### Requirement: Habit mutations are validated server-side
The system SHALL validate habit create, update, delete, check-in, note, and contract inputs on the server before persistence.

#### Scenario: Habit create is missing required fields
- **WHEN** a create-habit request omits the habit name
- **THEN** the system rejects the request with validation feedback and creates no record

### Requirement: Habit check-in flow persists mood and journal details
The system SHALL persist completion, mood score, and journal text for a habit check-in.

#### Scenario: User saves mood after check-in
- **WHEN** a user marks a habit done and saves a mood note
- **THEN** the system stores the check-in with completion, mood, and journal fields

### Requirement: Habit history supports idempotent daily toggles
The system SHALL allow a user to complete, update, or clear one check-in per habit per date key.

#### Scenario: User toggles the same habit twice
- **WHEN** a user marks today's completed habit incomplete
- **THEN** the system clears or marks inactive the check-in for that habit and date key

### Requirement: Habit API supports web and future mobile clients
The system SHALL expose versioned route-handler contracts for habit data in addition to web server actions.

#### Scenario: Mobile client requests habits
- **WHEN** an authenticated API client requests `/api/v1/habits`
- **THEN** the system returns the user's habits using the documented response shape
