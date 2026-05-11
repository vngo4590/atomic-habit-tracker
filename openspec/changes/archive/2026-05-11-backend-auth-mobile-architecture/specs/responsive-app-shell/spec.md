## ADDED Requirements

### Requirement: Navigation adapts to mobile screens
The system SHALL provide mobile-compatible navigation for all authenticated app routes.

#### Scenario: User opens app on phone width
- **WHEN** the viewport width is 390px
- **THEN** the system renders navigation that is usable without horizontal scrolling

### Requirement: Screens avoid horizontal overflow
The system SHALL render every app screen without unintended horizontal scrolling on common mobile widths.

#### Scenario: User opens analytics on phone width
- **WHEN** the viewport width is 390px
- **THEN** the analytics content fits within the viewport and chart content remains readable

### Requirement: Dense data views reflow for touch use
The system SHALL convert tables, history grids, charts, modals, and multi-column cards into mobile-appropriate layouts.

#### Scenario: User opens habits list on phone width
- **WHEN** the viewport width is 390px
- **THEN** habit rows render as touch-friendly stacked cards instead of a clipped desktop table

### Requirement: Touch targets meet mobile usability expectations
The system SHALL size primary controls, navigation controls, and form controls for reliable touch interaction.

#### Scenario: User checks in a habit on mobile
- **WHEN** a user taps the check button on a mobile screen
- **THEN** the target is large enough to activate reliably without zooming
