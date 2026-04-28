## ADDED Requirements

### Requirement: Persistent sidebar navigation is visible on all screens
The system SHALL render a 232px sidebar with grouped nav items on every screen. The sidebar SHALL NOT re-render or flash when navigating between routes.

#### Scenario: Active nav item is highlighted
- **WHEN** the user is on the `/habits` route
- **THEN** the "All habits" nav item has the active style (elevated background, accent icon color)

#### Scenario: Sidebar groups nav items into Practice, Reflect, Learn, Become
- **WHEN** the sidebar renders
- **THEN** nav items are grouped under four labeled section headers in order

### Requirement: Keyboard shortcuts navigate between screens
The system SHALL support single-key shortcuts (T, H, N, A, J, W, L, F, I, comma) to navigate to the corresponding screen.

#### Scenario: Pressing a shortcut key navigates to the screen
- **WHEN** the user presses `H` while focus is not on an input element
- **THEN** the browser navigates to `/habits`

#### Scenario: Shortcuts are suppressed inside text inputs
- **WHEN** the user presses `H` while a text input or textarea is focused
- **THEN** no navigation occurs and the character is typed normally

### Requirement: The sidebar footer shows the user's identity statement
The system SHALL display an avatar and the user's current identity statement (or name) in the sidebar footer.

#### Scenario: Footer shows avatar initials and identity label
- **WHEN** the sidebar renders
- **THEN** a circular avatar with initials and a two-line block (name + identity label) is visible at the bottom of the sidebar

### Requirement: A toast notification system is globally available
The system SHALL support displaying a temporary toast notification from any screen. The toast SHALL auto-dismiss after 2.4 seconds.

#### Scenario: Toast appears after checking a habit
- **WHEN** the user checks a habit done
- **THEN** a toast appears at the bottom of the screen showing "Vote cast for [identity]" with the total vote count

#### Scenario: Toast auto-dismisses
- **WHEN** a toast is shown
- **THEN** it disappears automatically after 2.4 seconds without user interaction
