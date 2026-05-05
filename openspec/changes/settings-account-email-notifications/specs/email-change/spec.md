## ADDED Requirements

### Requirement: User can request an email address change
An authenticated user SHALL be able to request that their email address be changed to a new address from the Account section of Settings.

#### Scenario: User submits a new email address
- **WHEN** the user enters a new, valid email address and submits the email change form
- **THEN** the system SHALL NOT immediately update `User.email`
- **AND** the system SHALL create a `VerificationToken` record namespaced as `change:<newEmail>:<userId>` with a 24-hour expiry
- **AND** a confirmation email SHALL be sent to the *new* email address containing a unique, single-use link
- **AND** a message SHALL be displayed: "Confirmation email sent to <newEmail>. Your email will update after you click the link."

#### Scenario: New email is the same as current email
- **WHEN** the user submits the same email address they already have
- **THEN** the system SHALL display an inline error "This is already your email address" and SHALL NOT send any email

#### Scenario: New email is already registered to another account
- **WHEN** the user submits an email address that belongs to a different account
- **THEN** the system SHALL display an inline error "That email is already in use"
- **AND** SHALL NOT reveal whether the other account exists (to avoid account enumeration)

#### Scenario: User has a pending email change
- **WHEN** the user submits a new email change request while a previous confirmation token exists
- **THEN** the old token SHALL be deleted
- **AND** a new token and email SHALL be issued for the newly requested address

### Requirement: Email change is confirmed via link
Clicking the confirmation link sent to the new address SHALL apply the email change.

#### Scenario: Valid, unexpired confirmation link is clicked
- **WHEN** the user clicks a valid email-change confirmation link within 24 hours
- **THEN** the system SHALL update `User.email` to the new address
- **AND** `User.emailVerified` SHALL be set to the current timestamp
- **AND** the confirmation token SHALL be consumed and deleted
- **AND** the user SHALL be redirected to Settings with a success toast "Email updated"

#### Scenario: Expired confirmation link is clicked
- **WHEN** the user clicks an email-change link after it has expired
- **THEN** the system SHALL display an "This link has expired" message
- **AND** the user's email SHALL remain unchanged

#### Scenario: Already-used confirmation link is clicked
- **WHEN** the user clicks an email-change link that has already been used
- **THEN** the system SHALL display an "This link is no longer valid" message

### Requirement: Unconfirmed email changes do not affect login
Until the user clicks the confirmation link, their login credentials SHALL remain bound to their current (original) email address.

#### Scenario: Login during pending email change
- **WHEN** a user has a pending email change but has not clicked the confirmation link
- **THEN** the user SHALL still be able to log in with their original email and password
- **AND** the new email SHALL NOT be accepted for login
