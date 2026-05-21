## MODIFIED Requirements

### Requirement: A habit has the Atomic Habits four-law fields
Each habit record SHALL contain: `id`, `name`, `emoji`, `cue`, `craving`, `response`, `reward`, `twoMin`, `stackNextId`, `identity`, `environment`, `schedule`, `time`, `contract`, `contractPartners`, `history` (date-keyed object), `notes` (array), and `createdAt` (ISO date string).

#### Scenario: Creating a habit stores all required fields
- **WHEN** `addHabit(draft)` is called with a minimal draft (`name`, `identity`)
- **THEN** the resulting habit has all fields present (optional fields default to empty string, empty array, or null)

## ADDED Requirements

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
