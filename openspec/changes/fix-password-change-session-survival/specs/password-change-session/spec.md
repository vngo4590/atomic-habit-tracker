## ADDED Requirements

### Requirement: Current device survives a password change

After a user successfully changes their own password, the system SHALL keep the initiating
(current) device authenticated. The current session's issue time (`authTime`) SHALL be
refreshed so it is at or after the user's revocation cutoff (`sessionsValidFrom`), so the
server-side revocation gate does NOT reject the current session.

#### Scenario: Current session stays authenticated after a successful change

- **WHEN** a user submits a valid current password and a valid new password
- **AND** the server reports the change succeeded
- **THEN** the current session's `authTime` is refreshed to at or after the new
  `sessionsValidFrom` cutoff
- **AND** the very next server request from the current device resolves the current user
  (the session is NOT treated as revoked)

#### Scenario: The user can change their password repeatedly in one session

- **WHEN** a user has already changed their password once in the current session
- **AND** the user submits the correct new current password and another valid new password
- **THEN** the second change succeeds
- **AND** the user remains authenticated on the current device throughout

### Requirement: Other devices are revoked on a password change

When a user changes their password, the system SHALL revoke every OTHER session for that
user (any session whose issue time predates the revocation cutoff), so a stale or stolen
cookie on another device cannot outlive the password it was created under.

#### Scenario: Another device is signed out after a change

- **WHEN** a user changes their password on the current device
- **THEN** the user's revocation cutoff (`sessionsValidFrom`) is advanced
- **AND** any other device whose session was issued before that cutoff is rejected on its
  next server request

### Requirement: Wrong current password is reported accurately

The password-change action SHALL, while the current session is valid, return a "current
password is incorrect" style message when the submitted current password is wrong, and
SHALL NOT return a "not authenticated" style message. The password comparison SHALL run
(the action MUST NOT short-circuit as unauthenticated for a still-valid session).

#### Scenario: Incorrect current password after a prior successful change

- **WHEN** a user has successfully changed their password once in the current session
- **AND** the user then submits an INCORRECT current password
- **THEN** the response reports that the current password is incorrect
- **AND** the response does NOT report that the user is not authenticated

### Requirement: Session revocation comparison semantics

The pure revocation check `isSessionRevoked(authTime, sessionsValidFrom)` SHALL treat a
session as revoked only when its issue time is strictly earlier than the revocation cutoff,
and SHALL fail closed for a missing issue time and fail open for a missing cutoff.

#### Scenario: Issue time equal to the cutoff is not revoked

- **WHEN** `authTime` equals `sessionsValidFrom`
- **THEN** the session is NOT revoked

#### Scenario: Issue time after the cutoff is not revoked

- **WHEN** `authTime` is later than `sessionsValidFrom`
- **THEN** the session is NOT revoked

#### Scenario: Issue time before the cutoff is revoked

- **WHEN** `authTime` is earlier than `sessionsValidFrom`
- **THEN** the session is revoked

#### Scenario: Missing issue time fails closed

- **WHEN** `sessionsValidFrom` is set
- **AND** `authTime` is null or undefined
- **THEN** the session is revoked

#### Scenario: Missing cutoff fails open

- **WHEN** `sessionsValidFrom` is null or undefined
- **THEN** the session is NOT revoked

### Requirement: Session update re-stamps the issue time

The JWT callback SHALL re-stamp the session issue time (`authTime`) to the current moment
when invoked with an `update` trigger, while continuing to stamp the issue time once on
initial sign-in and preserving it across ordinary token slides.

#### Scenario: Update trigger refreshes the issue time

- **WHEN** the JWT callback runs with `trigger` equal to `"update"`
- **THEN** the token's `authTime` is set to the current moment

#### Scenario: Initial sign-in stamps the issue time

- **WHEN** the JWT callback runs on initial sign-in (a user is present)
- **THEN** the token's `authTime` is set to the sign-in moment

#### Scenario: Ordinary token slide preserves the issue time

- **WHEN** the JWT callback runs without a user and without an `update` trigger
- **THEN** the token's existing `authTime` is preserved unchanged
