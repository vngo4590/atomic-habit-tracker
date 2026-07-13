## ADDED Requirements

### Requirement: Reusable contextual help control

The system SHALL provide a single reusable help control (`HelpTip`) that renders a small
`?` trigger button alongside any content and reveals a short explanatory popover when
activated. The explanatory text SHALL be supplied by the caller so the control can explain any
mechanic, not just one specific feature.

#### Scenario: Help text is hidden until requested

- **WHEN** a `HelpTip` first renders
- **THEN** its trigger button is visible
- **AND** the explanatory popover is not shown

#### Scenario: Activating the trigger reveals the help text

- **WHEN** the user activates the `HelpTip` trigger
- **THEN** the explanatory popover becomes visible with the caller-supplied text

### Requirement: The help control is accessible

The `HelpTip` trigger SHALL be a non-submitting, keyboard-focusable button that exposes an
accessible label, communicates its expanded/collapsed state, and is programmatically associated
with the popover it reveals.

#### Scenario: Trigger is a labelled, non-submitting button

- **WHEN** the `HelpTip` trigger is rendered inside a form
- **THEN** it is declared as `type="button"` so it does not submit the form
- **AND** it exposes an accessible label

#### Scenario: Trigger communicates and associates its popover

- **WHEN** the popover is open
- **THEN** the trigger's `aria-expanded` reflects the open state
- **AND** the trigger is associated with the popover via `aria` attributes so assistive
  technology can announce the revealed text

#### Scenario: The popover can be dismissed by keyboard

- **GIVEN** an open `HelpTip` popover
- **WHEN** the user presses Escape
- **THEN** the popover closes and the trigger returns to its collapsed state
