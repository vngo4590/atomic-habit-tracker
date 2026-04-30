## ADDED Requirements

### Requirement: Domain data is persisted in a database
The system SHALL persist authenticated user data in a durable database instead of relying on sample data or browser-only storage.

#### Scenario: User refreshes after creating a habit
- **WHEN** an authenticated user creates a habit and refreshes the page
- **THEN** the habit is loaded from the database

### Requirement: All user-owned records are scoped by owner
The system SHALL associate user-owned records with a user and enforce ownership in every protected read and write.

#### Scenario: User cannot read another user's habit
- **WHEN** user A requests a habit owned by user B
- **THEN** the system returns a not-found or forbidden response without exposing the habit

### Requirement: Habit check-ins support user-local date keys
The system SHALL store habit check-ins with a user-local `YYYY-MM-DD` date key and an auditable timestamp.

#### Scenario: User checks in for today
- **WHEN** a user marks a habit complete for their local day
- **THEN** the system stores one check-in for that habit and date key

### Requirement: Preferences follow the authenticated user
The system SHALL persist theme, accent, notification settings, onboarding status, and lesson mode as user preferences.

#### Scenario: User changes theme on one device
- **WHEN** a user switches to dark mode
- **THEN** the system persists the preference so another device can load dark mode for the same user

### Requirement: Sample data is excluded from production user state
The system SHALL not seed mock habits, journal entries, or identity data into normal authenticated user accounts.

#### Scenario: New account opens Today screen
- **WHEN** a newly registered user opens the Today screen
- **THEN** the system shows an empty-state prompt instead of sample habits
