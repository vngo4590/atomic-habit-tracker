# onboarding Specification

## Purpose
TBD - created by archiving change port-reference-ui. Update Purpose after archive.
## Requirements
### Requirement: Onboarding overlay shows on first visit only
The system SHALL display a 4-step onboarding overlay when localStorage has no existing store data. It SHALL NOT show on subsequent visits.

#### Scenario: Onboarding shows on first visit
- **WHEN** localStorage has no `atomicly:store` key
- **THEN** the onboarding overlay appears on top of the Today screen

#### Scenario: Onboarding does not show on return visits
- **WHEN** `atomicly:store` exists in localStorage
- **THEN** the onboarding overlay is not rendered

### Requirement: Onboarding has four steps with a progress indicator
The system SHALL render Welcome, Name, Identity explanation, and Ready steps. A four-dot progress bar tracks the current step. The user can advance with the primary button or skip with "Skip".

#### Scenario: Next button advances the step
- **WHEN** the user clicks "Begin" on step 0
- **THEN** step 1 (name input) becomes active

#### Scenario: Skip closes the overlay immediately
- **WHEN** the user clicks "Skip" on any step
- **THEN** the overlay closes and the Today screen is fully visible

### Requirement: Name step requires input before advancing
The system SHALL disable the Next button on the Name step until the user has typed at least one character.

#### Scenario: Next is disabled with empty name
- **WHEN** the name input is empty on the Name step
- **THEN** the Next button is disabled

#### Scenario: Next enables after typing a name
- **WHEN** the user types their name
- **THEN** the Next button becomes enabled

