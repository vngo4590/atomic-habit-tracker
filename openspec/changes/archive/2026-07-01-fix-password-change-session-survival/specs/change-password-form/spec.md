## MODIFIED Requirements

### Requirement: Successful change shows confirmation

The system SHALL confirm a successful password change to the user, and the confirmation
SHALL accurately reflect that the current device remains signed in while the user's OTHER
devices were signed out. The confirmation SHALL NOT instruct the user to sign in again on
the current device.

#### Scenario: Successful submission

- **WHEN** the user submits a valid current and new password
- **AND** the server reports success
- **THEN** the user sees a success confirmation for the change
- **AND** the confirmation indicates the user's other devices were signed out
- **AND** the confirmation does NOT tell the user they must sign in again on the current
  device
