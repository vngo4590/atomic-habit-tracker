## ADDED Requirements

### Requirement: Account section displays real user data
The Settings page Account section SHALL display the authenticated user's name, email address, and email verification status sourced from the active session.

#### Scenario: Authenticated user views settings
- **WHEN** an authenticated user opens the Settings page
- **THEN** the Account section shows their actual name and email address from the session
- **AND** the "Storage" row SHALL NOT be rendered

#### Scenario: Email is unverified
- **WHEN** the user's `emailVerified` field is null
- **THEN** the Account section SHALL display an "Unverified" badge next to the email
- **AND** a "Resend verification email" action SHALL be available

#### Scenario: Email is verified
- **WHEN** the user's `emailVerified` field is a non-null timestamp
- **THEN** the Account section SHALL display a "Verified" indicator next to the email

### Requirement: User can edit their display name
The system SHALL allow an authenticated user to edit their display name inline from the Account section without navigating away.

#### Scenario: User edits name successfully
- **WHEN** the user clicks the edit affordance on the Profile row
- **THEN** the name field becomes an editable input pre-filled with the current name
- **AND** on confirmation the system SHALL persist the new name to the database
- **AND** the session SHALL be updated to reflect the new name on next load

#### Scenario: User submits an empty name
- **WHEN** the user clears the name field and confirms
- **THEN** the system SHALL reject the update and display an inline error "Name cannot be empty"

#### Scenario: Name update succeeds
- **WHEN** a valid new name is submitted
- **THEN** the Account row SHALL display the new name
- **AND** a success toast SHALL appear

### Requirement: Storage row is removed
The Account section SHALL NOT contain a "Storage" row or any reference to "This browser" as a storage location.

#### Scenario: Settings page renders
- **WHEN** the Settings page is rendered
- **THEN** no row with the label "Storage" or value "This browser" SHALL be present in the Account section
