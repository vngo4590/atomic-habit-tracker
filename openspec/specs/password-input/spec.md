# password-input Specification

## Purpose
Define the single reusable password-input primitive used across the auth forms and the
settings change-password form, so every password field shares one tested, accessible
show/hide visibility toggle instead of duplicating reveal logic.
## Requirements
### Requirement: Reusable password input with visibility toggle

The system SHALL provide a single reusable password input primitive that renders a standard
text field together with an inline "eye" toggle button. The input SHALL forward standard
field attributes (such as `name`, `autoComplete`, `required`, and `minLength`) so it is a
drop-in replacement for a plain `<input type="password">`. All password fields in the auth
forms and the settings change-password form SHALL be built from this single primitive rather
than duplicating toggle logic.

#### Scenario: Password is concealed by default

- **WHEN** the password input first renders
- **THEN** the field's type is `password` so the typed characters are masked
- **AND** the toggle button's accessible label is "Show password"

#### Scenario: Revealing the password

- **WHEN** the user activates the toggle button while the field is concealed
- **THEN** the field's type changes to `text` so the typed characters are visible
- **AND** the toggle button's accessible label changes to "Hide password"

#### Scenario: Concealing the password again

- **WHEN** the user activates the toggle button while the field is revealed
- **THEN** the field's type changes back to `password`
- **AND** the toggle button's accessible label changes back to "Show password"

### Requirement: Toggle is accessible and never submits the form

The visibility toggle SHALL be operable by keyboard and assistive technology, and SHALL NOT
trigger form submission when activated.

#### Scenario: Toggle does not submit the surrounding form

- **WHEN** the toggle button is activated inside a form
- **THEN** the button is declared as `type="button"` so the surrounding form is not submitted

#### Scenario: Toggle exposes an accessible label

- **WHEN** the toggle button is rendered in either state
- **THEN** it exposes an `aria-label` describing its current action ("Show password" or
  "Hide password")
- **AND** it is reachable and operable using the keyboard

### Requirement: Independent toggles per field

Each password input instance SHALL manage its own visibility state independently, so revealing
one field does not reveal any other field on the page.

#### Scenario: Two password fields toggle independently

- **WHEN** a page renders two password inputs and the user reveals the first one
- **THEN** the first field becomes `text` while the second field remains `password`

