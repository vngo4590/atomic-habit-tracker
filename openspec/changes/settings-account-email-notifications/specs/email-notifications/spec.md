## ADDED Requirements

### Requirement: Daily habit reminder email
When the `remindersEnabled` preference is true, the system SHALL send a daily reminder email to the user's verified email address.

#### Scenario: User opens app and reminder is due today
- **WHEN** an authenticated user loads the app
- **AND** `remindersEnabled` is true
- **AND** a reminder email has NOT already been sent today (tracked by a `lastReminderSentAt` date key on `UserPreference`)
- **AND** the user has at least one active habit
- **THEN** the system SHALL dispatch a formatted reminder email listing the user's habits for today
- **AND** record today's date as the last sent date to prevent duplicate sends

#### Scenario: Reminder already sent today
- **WHEN** an authenticated user loads the app and a reminder was already sent today
- **THEN** the system SHALL NOT send another reminder email

#### Scenario: User has no active habits
- **WHEN** `remindersEnabled` is true but the user has no habits
- **THEN** no reminder email SHALL be sent

#### Scenario: User email is unverified
- **WHEN** `remindersEnabled` is true but `User.emailVerified` is null
- **THEN** no notification email SHALL be sent
- **AND** the Settings page SHALL indicate that notifications require a verified email

### Requirement: Weekly review nudge email
When the `weeklyReviewNudge` preference is true, the system SHALL send a formatted nudge email to prompt the user to complete their weekly review.

#### Scenario: User completes the week without a review
- **WHEN** it is the start of a new week
- **AND** `weeklyReviewNudge` is true
- **AND** a weekly review nudge has NOT been sent for the current week
- **THEN** the system SHALL send a nudge email summarising the previous week's habit completion rate
- **AND** include a direct link to the weekly review page

#### Scenario: User has already completed their review
- **WHEN** the user has submitted a weekly review for the current week
- **THEN** no nudge email SHALL be sent for that week

### Requirement: Accountability contract alert email
When the `accountabilityNudge` preference is true, the system SHALL send an alert email when a habit with an accountability contract is missed.

#### Scenario: Accountability habit missed
- **WHEN** a habit has a `HabitContract` with at least one partner
- **AND** `accountabilityNudge` is true
- **AND** the habit was not completed on the previous day
- **THEN** the system SHALL send an alert email to the habit owner notifying them of the missed habit

#### Scenario: No accountability contract on habit
- **WHEN** a habit does not have a `HabitContract` record
- **THEN** no accountability alert SHALL be sent for that habit regardless of completion status

### Requirement: Notification emails are only sent to verified addresses
The system SHALL refuse to send any notification email to a user whose `emailVerified` is null.

#### Scenario: Send attempted for unverified user
- **WHEN** any notification send is triggered for a user
- **AND** `User.emailVerified` is null
- **THEN** the send SHALL be skipped silently server-side
- **AND** the Settings page SHALL show a contextual note: "Verify your email to receive notifications"

### Requirement: Notification emails are formatted and branded
All notification emails SHALL use a consistent, readable HTML template that identifies the Atomicly app and includes an unsubscribe/settings link.

#### Scenario: Reminder email structure
- **WHEN** a reminder email is sent
- **THEN** it SHALL include the user's name, a list of today's habits, and a link back to the app
- **AND** SHALL include a footer link to the Settings page for managing notification preferences

#### Scenario: Weekly review nudge email structure
- **WHEN** a weekly review nudge email is sent
- **THEN** it SHALL include the previous week's habit summary (completion percentage) and a direct link to `/review`

#### Scenario: Accountability alert email structure
- **WHEN** an accountability alert email is sent
- **THEN** it SHALL name the specific habit that was missed and include a link to that habit's detail page
