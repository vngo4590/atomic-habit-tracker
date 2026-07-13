## ADDED Requirements

### Requirement: A user may have at most three active habits

The system SHALL limit each user to at most **three active habits** at any time. An "active"
habit is one that is **not archived** (`archivedAt` is null) **and not inducted** into the Hall
of Fame (it has no `FormationVerdict` whose `decision` is `formed`). The limit SHALL be
enforced when creating a habit, using the same definition of "active" on the server (the source
of truth) and on the client (a mirror for user experience).

#### Scenario: Creating a habit under the cap succeeds

- **WHEN** a user who has fewer than three active habits creates a new habit
- **THEN** the habit is created and returned as a success result

#### Scenario: Creating a fourth active habit is refused server-side

- **WHEN** a user who already has three active habits attempts to create another habit
- **THEN** the create-habit repository returns a structured refusal result with reason `cap`
- **AND** no new habit row is written to the database
- **AND** the failure is a discriminated result, not an uncaught thrown error

### Requirement: Inducted habits do not count toward the cap

An inducted habit SHALL remain fully trackable but SHALL NOT count toward the active-habit cap,
so inducting a habit frees a slot for a new one. A habit is inducted when it has a
`FormationVerdict` whose `decision` is `formed`.

#### Scenario: An inducted habit frees a slot

- **GIVEN** a user has three non-archived habits, exactly one of which is inducted (`formed`)
- **WHEN** the user creates a new habit
- **THEN** the create succeeds, because only two of the three habits are active

#### Scenario: A "keep practicing" verdict does not free a slot

- **GIVEN** a user has three non-archived habits, one of which has a verdict of
  `keep_practicing`
- **WHEN** the user attempts to create a new habit
- **THEN** the create is refused with reason `cap`, because a non-formed verdict does not induct
  the habit

### Requirement: Archived habits do not count toward the cap

A habit that has been archived (`archivedAt` is set) SHALL NOT count toward the active-habit
cap.

#### Scenario: Archiving a habit frees a slot

- **GIVEN** a user has three non-archived, non-inducted habits and then archives one of them
- **WHEN** the user creates a new habit
- **THEN** the create succeeds, because only two habits remain active

### Requirement: Existing data is grandfathered

The system SHALL NOT force-archive or otherwise mutate any existing habit in order to enforce
the cap. A user who already has more than three active habits SHALL simply be blocked from
creating new habits until their active count falls below three.

#### Scenario: A user already above the cap is only blocked from creating

- **GIVEN** a user already has four active habits (created before this rule existed)
- **WHEN** the rule takes effect
- **THEN** none of their existing habits are archived or changed
- **AND** they cannot create a new habit until their active count drops below three

### Requirement: The create-habit API surfaces the cap refusal

The `POST /api/v1/habits` route SHALL surface a cap refusal as an HTTP 409 (Conflict) response
rather than a 500, so API clients can distinguish "cap reached" from an unexpected error.

#### Scenario: API returns 409 when the cap is reached

- **WHEN** an authenticated API client posts a new habit while at the active-habit cap
- **THEN** the response status is 409
- **AND** no habit is created

### Requirement: The new-habit page prevents submission at the cap

The new-habit page SHALL compute the user's active-habit count using the shared client
predicate and, when the user is at the cap, SHALL disable the "Create habit" action and display
a clear message explaining that the user has reached the maximum of three active habits and that
inducting a habit into the Hall of Fame frees a slot.

#### Scenario: Submit is disabled and explained at the cap

- **GIVEN** a user viewing the new-habit page who already has three active habits
- **WHEN** the page renders
- **THEN** the "Create habit" control is disabled
- **AND** a message explains the three-active-habit maximum and that the Hall of Fame frees a
  slot

#### Scenario: Submit is enabled below the cap

- **GIVEN** a user viewing the new-habit page who has fewer than three active habits and has
  filled the required fields
- **WHEN** the page renders
- **THEN** the "Create habit" control is enabled

### Requirement: The optimistic store rolls back a cap refusal

The optimistic create-habit store action SHALL roll back its optimistic addition and surface a
user-visible message (via the existing Toast) when the server refuses the create with reason
`cap`, rather than silently logging the failure.

#### Scenario: Optimistic add is rolled back on cap refusal

- **GIVEN** the store optimistically added a new habit while the user was at the cap (e.g. a
  race across browser tabs)
- **WHEN** the server returns a refusal with reason `cap`
- **THEN** the optimistically added habit is removed from the store
- **AND** a Toast explaining the cap is shown

#### Scenario: Successful create swaps the optimistic entry

- **WHEN** the server returns a success result for an optimistic add
- **THEN** the optimistic entry is replaced by the persisted habit and no Toast error is shown
