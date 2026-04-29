## ADDED Requirements

### Requirement: Habit data persists across page refreshes via localStorage
The system SHALL save and restore all habits, journal entries, and identity state to/from localStorage under the key `atomicly:store`. First-time visitors SHALL see sample data pre-loaded.

#### Scenario: State is restored on page load
- **WHEN** the user navigates away and returns
- **THEN** all habits, their history, and journal entries are identical to what was saved

#### Scenario: Sample data loads on first visit
- **WHEN** localStorage has no `atomicly:store` entry
- **THEN** six sample habits with 90-day seeded history are loaded into the store

### Requirement: A habit has the Atomic Habits four-law fields
Each habit record SHALL contain: `id`, `name`, `emoji`, `cue`, `craving`, `response`, `reward`, `twoMin`, `stack`, `identity`, `environment`, `schedule`, `time`, `contract`, `contractPartners`, `history` (date-keyed object), `notes` (array), and `createdAt` (ISO date string).

#### Scenario: Creating a habit stores all required fields
- **WHEN** `addHabit(draft)` is called with a minimal draft (`name`, `identity`)
- **THEN** the resulting habit has all fields present (optional fields default to empty string or empty array)

### Requirement: Toggle a habit's completion for a given day
The system SHALL toggle a habit's history entry for a date key. Toggling an already-done habit SHALL remove the entry. Toggling an undone habit SHALL set it to `true` (or a check-in object with mood/journal if provided).

#### Scenario: Unchecked habit becomes done
- **WHEN** `toggleHabit(id)` is called for a habit not done today
- **THEN** `habit.history[todayKey()]` is truthy

#### Scenario: Done habit becomes undone
- **WHEN** `toggleHabit(id)` is called for a habit already done today
- **THEN** `habit.history[todayKey()]` is removed

### Requirement: Streak and completion rate are calculated from history
`streak(habit)` SHALL return the number of consecutive days ending today (or yesterday if today is not done). `longestStreak(habit)` SHALL return the longest ever consecutive run. `completionRate(habit, days)` SHALL return a 0–1 fraction of days done in the last N days.

#### Scenario: Streak counts consecutive days backwards from today
- **WHEN** a habit has history entries for the last 5 days
- **THEN** `streak(habit)` returns 5

#### Scenario: Streak resets on a missed day
- **WHEN** a habit has a gap in history two days ago
- **THEN** `streak(habit)` returns only the days since the gap

#### Scenario: Completion rate over 30 days
- **WHEN** a habit has 24 entries in the last 30 days
- **THEN** `completionRate(habit, 30)` returns 0.8

### Requirement: Check-in can include mood and journal text
`logCheckIn(id, payload, dateKey)` SHALL merge `mood` and `journal` fields into the history entry for the given date without removing existing check-in state.

#### Scenario: Logging mood on an existing check-in preserves done state
- **WHEN** `logCheckIn(id, { mood: 4 })` is called for a habit already done today
- **THEN** `habit.history[todayKey()]` has both `done: true` and `mood: 4`
