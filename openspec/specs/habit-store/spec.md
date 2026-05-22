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
Each habit record SHALL contain: `id`, `name`, `emoji`, `cue`, `craving`, `response`, `reward`, `twoMin`, `stackNextId`, `identity`, `environment`, `schedule`, `time`, `contract`, `contractPartners`, `history` (date-keyed object), `notes` (array), and `createdAt` (ISO date string).

#### Scenario: Creating a habit stores all required fields
- **WHEN** `addHabit(draft)` is called with a minimal draft (`name`, `identity`)
- **THEN** the resulting habit has all fields present (optional fields default to empty string, empty array, or null)

### Requirement: A habit links to the next habit in its stack via stackNextId
Each habit record SHALL contain an optional `stackNextId` field. When set, it references the `id` of the habit that follows it in the stack chain. A null `stackNextId` means the habit is the tail of its stack.

#### Scenario: Creating a habit with no stack leaves stackNextId empty
- **WHEN** `addHabit(draft)` is called without a `stackNextId`
- **THEN** the resulting habit has `stackNextId` set to `null`

#### Scenario: Linking a habit to a successor stores the reference
- **WHEN** `updateHabit(id, { stackNextId: 'habit-b' })` is called
- **THEN** the habit's `stackNextId` becomes `'habit-b'`

### Requirement: A habit can belong to at most one stack chain
The system SHALL reject any stack link that would place a habit in more than one chain. A habit is considered "in a chain" if it is the `stackNextId` of any other habit or if it has a non-null `stackNextId`.

#### Scenario: Linking a habit that is already a successor fails
- **WHEN** habit A has `stackNextId: 'habit-c'` and the user attempts to set habit B's `stackNextId` to `'habit-c'`
- **THEN** the update is rejected with the error message "This habit is already in another stack. Remove it first."

#### Scenario: Removing a habit from its chain frees it for reuse
- **WHEN** habit A has `stackNextId: 'habit-b'` and the user sets habit A's `stackNextId` to `null`
- **THEN** habit B is no longer referenced as a successor and can be linked by another habit

### Requirement: Circular stack references are blocked
The system SHALL detect and reject any `stackNextId` assignment that would create a cycle in the stack chain.

#### Scenario: Direct self-reference is rejected
- **WHEN** the user attempts to set a habit's `stackNextId` to its own `id`
- **THEN** the update is rejected with the error message "A habit cannot stack with itself."

#### Scenario: Indirect cycle is rejected
- **WHEN** habit A → B → C exists and the user attempts to set C's `stackNextId` to A
- **THEN** the update is rejected with the error message "This would create a circular stack."

### Requirement: Stack helpers expose chain navigation and validation
The system SHALL provide the following helpers in `lib/stack.ts`:
- `getStackChain(habit, habits)` — returns the ordered array of habits in the chain starting from the root.
- `getStackRoot(habit, habits)` — returns the root habit of the chain.
- `getSuccessor(habit, habits)` — returns the next habit or `null`.
- `wouldCreateCycle(sourceId, targetId, habits)` — returns `true` if linking source → target creates a cycle.
- `stackInsertPatches(habitId, beforeOrAfter, targetId, habits)` — returns the minimal patch set to insert a habit before or after a target.
- `stackRemovePatches(habitId, habits)` — returns the minimal patch set to remove a habit and re-link its neighbors.
- `getVisibleStackHabit(habits, todayKey)` — returns the first undone habit in each stack chain for the Today page.
- `groupHabitsByStack(habits)` — returns habits grouped by their root stack id.

#### Scenario: getStackChain returns ordered habits from root to tail
- **WHEN** the chain is Root → A → B → Tail
- **THEN** `getStackChain(A, habits)` returns `[Root, A, B, Tail]`

#### Scenario: getVisibleStackHabit returns the first undone habit in a chain
- **WHEN** a stack chain has Root (done), A (not done), B (not done)
- **THEN** `getVisibleStackHabit` for that chain returns habit A

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
