## ADDED Requirements

### Requirement: Change-password panel toggles open and closed

The Settings page SHALL let a user open a change-password panel containing a "Current password"
field and a "New password" field, and close it again, without leaving the page.

#### Scenario: Opening the panel shows an empty form

- **WHEN** the user opens the change-password panel
- **THEN** an empty change-password form is shown with a "Current password" field and a
  "New password" field

#### Scenario: Each password field has its own visibility toggle

- **WHEN** the change-password form is shown
- **THEN** the "Current password" and "New password" fields each render their own independent
  show/hide visibility toggle

### Requirement: Successful change shows confirmation

The system SHALL confirm a successful password change to the user.

#### Scenario: Successful submission

- **WHEN** the user submits a valid current and new password
- **AND** the server reports success
- **THEN** the user sees a success confirmation for the change

### Requirement: Reopening after success shows a fresh form

After a successful password change, reopening the change-password panel SHALL present a fresh,
empty form rather than the previous success confirmation, so the user can change their password
again within the same session.

#### Scenario: Reopen after a successful change

- **WHEN** the user has successfully changed their password once
- **AND** the user closes the change-password panel and opens it again
- **THEN** an empty change-password form is shown again
- **AND** the stale "Password changed." success row is not shown
