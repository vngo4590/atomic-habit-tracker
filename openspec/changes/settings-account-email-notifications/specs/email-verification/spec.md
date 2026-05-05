## ADDED Requirements

### Requirement: Verification email sent on registration
After a new user account is successfully created, the system SHALL send an email verification link to the registered email address.

#### Scenario: Registration succeeds
- **WHEN** a user completes registration with a valid name, email, and password
- **THEN** the account SHALL be created and the user SHALL be signed in
- **AND** a verification email SHALL be dispatched to the registered address
- **AND** the email SHALL contain a unique, single-use link valid for 24 hours

#### Scenario: Email send fails at registration
- **WHEN** the email service is unavailable during registration
- **THEN** the account SHALL still be created and the user SHALL be signed in
- **AND** the failure SHALL be logged server-side
- **AND** the user SHALL see the "unverified" state in Settings with an option to resend

### Requirement: User can verify their email via the link
Clicking the verification link in the email SHALL mark the user's account as verified.

#### Scenario: Valid, unexpired link is clicked
- **WHEN** the user clicks a valid verification link within 24 hours
- **THEN** the system SHALL set `User.emailVerified` to the current timestamp
- **AND** the verification token SHALL be consumed and deleted
- **AND** the user SHALL be redirected to the app with a success message

#### Scenario: Expired link is clicked
- **WHEN** the user clicks a verification link after it has expired
- **THEN** the system SHALL display an "This link has expired" error page
- **AND** offer an option to request a new verification email (if logged in)

#### Scenario: Already-used link is clicked
- **WHEN** the user clicks a verification link that has already been used
- **THEN** the system SHALL display an "This link is no longer valid" message

### Requirement: User can request a new verification email
An authenticated user whose email is unverified SHALL be able to request a new verification email from the Settings page.

#### Scenario: Resend requested
- **WHEN** the user clicks "Resend verification email" in the Account section
- **THEN** any existing unexpired verification token for that email SHALL be deleted
- **AND** a new token SHALL be created and a fresh verification email SHALL be sent
- **AND** a toast SHALL confirm "Verification email sent"

#### Scenario: Resend when already verified
- **WHEN** the user attempts to resend but their email is already verified
- **THEN** the system SHALL do nothing and the resend affordance SHALL not be visible
