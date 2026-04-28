## ADDED Requirements

### Requirement: Habits list displays all habits in a sortable table
The system SHALL render all habits in a table with columns: Habit, Cue → response, Streak, Best streak, and 30-day completion bar. Clicking a row navigates to `/habits/[id]`.

#### Scenario: Rows are clickable and navigate to habit detail
- **WHEN** the user clicks a habit row
- **THEN** the browser navigates to `/habits/[id]` for that habit

### Requirement: Habits list supports four sort modes
The system SHALL allow sorting by Active streak (default), 30-day rate, Newest, and Name. The selected sort is reflected in a dropdown.

#### Scenario: Default sort is by active streak descending
- **WHEN** the Habits list renders with no sort override
- **THEN** the habit with the longest current streak appears first

#### Scenario: Switching to Name sort re-orders alphabetically
- **WHEN** the user selects "Name" from the sort dropdown
- **THEN** habits are re-ordered A→Z

### Requirement: Habits list supports time-of-day filter tabs
The system SHALL provide All, Morning, Afternoon, and Evening tabs. Selecting a tab filters the list to habits with the matching `time` value.

#### Scenario: Selecting Morning tab filters list
- **WHEN** the user clicks the "Morning" tab
- **THEN** only habits with `time === 'Morning'` are shown

#### Scenario: All tab shows every habit
- **WHEN** the user clicks the "All" tab
- **THEN** all habits appear regardless of time
