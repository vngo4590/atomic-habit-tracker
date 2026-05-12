## ADDED Requirements

### Requirement: Hall of Fame tracks the 66-day habit formation threshold
The system SHALL identify habits whose age (days since `createdAt`) is ≥66 and which have not yet been reviewed. These SHALL appear in a "Ready for review" section.

#### Scenario: Habits older than 66 days appear in the review section
- **WHEN** a habit was created 70 days ago and has no formation verdict
- **THEN** it appears in the "Ready for review" section

#### Scenario: Habits under 66 days show a progress bar
- **WHEN** a habit was created 30 days ago
- **THEN** it appears in "In progress" with a progress bar at ~45% (30/66)

### Requirement: Formation questionnaire scores automatic behavior on 5 dimensions
The system SHALL render a 5-question rating form (1–5 scale each) when the user initiates a habit review. The total score determines the recommendation text.

#### Scenario: Score ≥4 average shows "truly formed" recommendation
- **WHEN** all five questions are rated 4 or 5
- **THEN** the recommendation reads "This sounds like a habit that has truly formed."

#### Scenario: Induct button is disabled until all questions are answered
- **WHEN** fewer than 5 questions have been answered
- **THEN** the "Induct to Hall of Fame" button is disabled

### Requirement: Inducted habits are displayed in a gallery
The system SHALL persist induction verdicts under `atomicly:formed` in localStorage. Inducted habits appear in a two-column gallery with their self-rating score, best streak, and adherence.

#### Scenario: Inducted habit appears in the gallery on next load
- **WHEN** the user inducts a habit and refreshes the page
- **THEN** the habit appears in the inducted gallery
