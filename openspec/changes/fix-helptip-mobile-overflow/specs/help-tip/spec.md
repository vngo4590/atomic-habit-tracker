## ADDED Requirements

### Requirement: The help popover stays within the viewport

When the `HelpTip` popover is open, it SHALL remain fully visible within the browser viewport on
all screen sizes, including narrow mobile widths. The popover text SHALL NOT be clipped by, or
overflow past, the left or right edge of the screen. On viewports too narrow to center the
popover over its trigger, the control SHALL shift and/or constrain the popover so its content
stays readable within the visible area with a small margin from each edge.

#### Scenario: Popover near the screen edge on a narrow viewport

- **GIVEN** a `HelpTip` whose trigger sits near the right or left edge of a narrow (mobile) viewport
- **WHEN** the user opens the popover
- **THEN** the popover is positioned so its full width stays within the viewport
- **AND** none of its explanatory text is clipped by the screen edge

#### Scenario: Popover width adapts to small screens

- **GIVEN** a viewport narrower than the popover's preferred width
- **WHEN** the popover opens
- **THEN** the popover width is constrained to the available space (minus a small edge margin)
  rather than a fixed width that would exceed the viewport

### Requirement: The help control opens on click or tap

The `HelpTip` SHALL reveal its popover in response to a click or tap on the trigger, and this
open affordance SHALL be discoverable so users do not expect a hover-only tooltip. The trigger
SHALL expose an accessible name and communicate its expanded state, preserving the existing
keyboard and Escape-to-dismiss behaviour.

#### Scenario: Tap opens the popover on touch devices

- **GIVEN** a `HelpTip` rendered on a touch (mobile) device
- **WHEN** the user taps the trigger
- **THEN** the explanatory popover becomes visible
- **AND** tapping the trigger again, tapping outside, or pressing Escape dismisses it
