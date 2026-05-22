## ADDED Requirements

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
