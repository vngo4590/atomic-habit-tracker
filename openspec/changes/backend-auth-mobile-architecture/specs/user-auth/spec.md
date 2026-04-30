## ADDED Requirements

### Requirement: Users can create and access accounts
The system SHALL allow a new user to register, log in, log out, and return to the app with a server-verified session.

#### Scenario: New user registers successfully
- **WHEN** a visitor submits valid registration credentials
- **THEN** the system creates a user account and starts an authenticated session

#### Scenario: Existing user logs in successfully
- **WHEN** a registered user submits valid credentials
- **THEN** the system starts an authenticated session and redirects to the app

### Requirement: App routes are protected
The system SHALL prevent unauthenticated users from accessing authenticated app routes.

#### Scenario: Unauthenticated visitor opens dashboard route
- **WHEN** a visitor without a valid session opens `/habits`
- **THEN** the system redirects the visitor to the login flow

#### Scenario: Authenticated user opens dashboard route
- **WHEN** a user with a valid session opens `/habits`
- **THEN** the system renders that user's habit data

### Requirement: Sessions are verified on the server
The system SHALL verify the active user session before performing protected reads or writes.

#### Scenario: Mutation without session is rejected
- **WHEN** a request without a valid session attempts to create a habit
- **THEN** the system rejects the request without writing data

### Requirement: Auth state has explicit loading and error states
The system SHALL show clear pending and error states during login, registration, and logout operations.

#### Scenario: Login fails with invalid credentials
- **WHEN** a user submits invalid credentials
- **THEN** the system shows an authentication error and keeps the user logged out
