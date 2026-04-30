## ADDED Requirements

### Requirement: Backend contracts are versioned
The system SHALL expose mobile-ready backend contracts under a versioned API namespace.

#### Scenario: Client requests versioned endpoint
- **WHEN** a client calls `/api/v1/habits`
- **THEN** the system responds using the version 1 habit contract

### Requirement: Shared validation schemas define request and response shapes
The system SHALL define reusable validation schemas for server actions and API route handlers.

#### Scenario: Web and API create habit paths receive invalid input
- **WHEN** invalid create-habit input is submitted through either path
- **THEN** both paths reject it using the same validation rules

### Requirement: Mobile API does not depend on React client state
The system SHALL keep backend data access independent of React context, localStorage, and web-only components.

#### Scenario: API handler creates journal entry
- **WHEN** an authenticated API request creates a journal entry
- **THEN** the handler completes without using React context or browser storage

### Requirement: API responses use stable identifiers and timestamps
The system SHALL return durable IDs, ISO timestamps, and user-local date keys where applicable.

#### Scenario: Mobile client loads habit history
- **WHEN** a mobile client requests habit history
- **THEN** each check-in includes a stable ID, date key, and timestamp fields
