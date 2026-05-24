## ADDED Requirements

### Requirement: Onboarding overlay shows on first visit only
The system SHALL display the onboarding overlay the first time a signed-in user lands on the app shell and SHALL NOT show it on subsequent visits. The "seen" state is tracked by the server-side `onboardingSeen` preference and mirrored to the `atomicly:onboarding-seen` localStorage key for instant client-side suppression.

#### Scenario: Onboarding shows on first visit
- **WHEN** the user signs in for the first time and the `onboardingSeen` preference is false and the `atomicly:onboarding-seen` localStorage key is missing
- **THEN** the onboarding overlay appears on top of the Today screen

#### Scenario: Onboarding does not show on return visits
- **WHEN** the `onboardingSeen` preference is true or the `atomicly:onboarding-seen` localStorage key is set
- **THEN** the onboarding overlay is not rendered

### Requirement: Onboarding has three steps with a progress indicator
The system SHALL render Welcome, Identity explanation, and Ready steps. A three-dot progress bar tracks the current step. The user can advance with the primary button or skip with "Skip". The overlay SHALL NOT prompt for the user's name because the name is already captured during registration.

#### Scenario: Next button advances the step
- **WHEN** the user clicks "Begin" on the Welcome step
- **THEN** the Identity step becomes active

#### Scenario: Continue advances from Identity to Ready
- **WHEN** the user clicks "Continue" on the Identity step
- **THEN** the Ready step becomes active

#### Scenario: Start completes onboarding from the final step
- **WHEN** the user clicks "Start" on the Ready step
- **THEN** the overlay closes and the `onboardingSeen` preference is set to true

#### Scenario: Skip closes the overlay immediately
- **WHEN** the user clicks "Skip" on any step
- **THEN** the overlay closes and the Today screen is fully visible
