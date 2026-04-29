# today-screen Specification

## Purpose
TBD - created by archiving change port-reference-ui. Update Purpose after archive.
## Requirements
### Requirement: Today screen groups habits by time of day
The system SHALL group habits into Morning, Afternoon, and Evening sections based on each habit's `time` field. Only non-empty groups are rendered.

#### Scenario: Habits with Morning time appear in Morning section
- **WHEN** the Today screen renders
- **THEN** all habits with `time === 'Morning'` appear under the "Morning" section header

### Requirement: Completion ring shows percentage done today
The system SHALL display an SVG ring with the ratio of habits completed today, as a percentage integer (0–100).

#### Scenario: Ring updates when a habit is checked
- **WHEN** the user checks a habit done
- **THEN** the ring's arc and percentage text update to reflect the new completion count

### Requirement: 14-day sparkline shows daily completion trend
The system SHALL render a bar chart of the last 14 days, with each bar's height proportional to the fraction of habits done that day. Today's bar is accented; others use ink shades.

#### Scenario: Sparkline has 14 bars
- **WHEN** the Today screen renders
- **THEN** exactly 14 bars are visible

### Requirement: Identity vote panel shows today's votes by identity
The system SHALL display a list of identity strings with their vote count for the current day, derived from which habits were checked done today.

#### Scenario: No votes shows placeholder text
- **WHEN** no habits are done today
- **THEN** the panel shows an italic placeholder "No votes cast yet"

#### Scenario: Vote count increments on check-in
- **WHEN** the user checks a habit with `identity: 'reader'`
- **THEN** the panel shows "I am reader · +1"

### Requirement: Mood check-in sheet opens after checking a habit
The system SHALL open a modal overlay after a habit is checked done, allowing the user to rate their mood (1–5) and optionally write a journal note. The user can dismiss it to skip.

#### Scenario: Sheet opens on check
- **WHEN** the user checks an unchecked habit on the Today screen
- **THEN** the MoodCheckSheet modal opens for that habit

#### Scenario: Skipping saves only the done state
- **WHEN** the user clicks "Skip — just mark it done"
- **THEN** the modal closes and the habit remains checked with no mood/journal data

