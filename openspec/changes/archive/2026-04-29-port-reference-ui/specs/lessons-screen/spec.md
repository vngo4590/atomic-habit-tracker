## ADDED Requirements

### Requirement: Lessons screen presents one daily lesson from a 24-lesson curriculum
The system SHALL pick today's lesson based on the selected mode (sequential or random). The selection SHALL be stable for the day (the same lesson shown regardless of page refresh).

#### Scenario: Sequential mode returns the next unread lesson
- **WHEN** mode is sequential and lessons 1–3 are completed
- **THEN** lesson 4 is shown as today's lesson

#### Scenario: Random mode returns a stable lesson per day
- **WHEN** mode is random
- **THEN** multiple renders on the same date return the same lesson

### Requirement: Lesson completion is tracked and persisted
The system SHALL mark lessons as read when the user clicks "I've read this" in the lesson reader. Completed lessons SHALL persist across page refreshes.

#### Scenario: Completing a lesson adds it to the completed set
- **WHEN** the user clicks "I've read this" on lesson 5
- **THEN** lesson 5 is in the completed set and its card shows "✓ Read"

### Requirement: Lesson library shows all 24 lessons with filter tabs
The system SHALL provide filter tabs: All, Unread, and one per chapter (Foundations, Identity, 1st–4th Law, Advanced). Clicking a card opens the lesson reader.

#### Scenario: Unread filter shows only unread lessons
- **WHEN** the user selects "Unread" and 5 lessons are completed
- **THEN** only the remaining 19 lessons are shown

### Requirement: Curriculum map shows chapter progress as a block grid
The system SHALL render one colored block per lesson, grouped by chapter. Completed lessons are filled (accent), incomplete are muted. Today's lesson has a ring outline.

#### Scenario: Completed lessons render as filled blocks
- **WHEN** 8 lessons are completed
- **THEN** 8 blocks in the curriculum map are accent-filled
