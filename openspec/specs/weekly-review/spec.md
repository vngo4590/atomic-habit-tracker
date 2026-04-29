# weekly-review Specification

## Purpose
TBD - created by archiving change port-reference-ui. Update Purpose after archive.
## Requirements
### Requirement: Weekly review shows the last 7 days as a day strip
The system SHALL render a 7-column grid (one per day of the current week) with each column showing the date, weekday abbreviation, and a fill bar indicating fraction of habits done.

#### Scenario: Today's column is the rightmost
- **WHEN** the Weekly Review screen renders
- **THEN** the rightmost column corresponds to today's date

#### Scenario: Total check-ins fraction is shown above the strip
- **WHEN** the strip renders
- **THEN** a "X / Y check-ins · Z%" summary is displayed

### Requirement: Wins and Slips sections identify habits above/below thresholds
The system SHALL list habits with ≥85% 7-day completion in the "Wins" section and habits with <50% 7-day completion in the "Slips" section.

#### Scenario: A habit at 100% this week appears in Wins
- **WHEN** a habit was done all 7 days
- **THEN** it appears in the Wins section

#### Scenario: Empty Wins section shows a placeholder
- **WHEN** no habit is at 85%+ this week
- **THEN** "No habit was 85%+ this week" placeholder text appears

### Requirement: Three reflection text areas are shown for qualitative review
The system SHALL render three labeled textareas: "What went well? Why?", "What didn't? What's the smallest fix?", and "Who did I vote to become this week?" with a Save button.

#### Scenario: All three textareas are present
- **WHEN** the Weekly Review screen renders
- **THEN** three textarea fields with their respective prompts are visible

