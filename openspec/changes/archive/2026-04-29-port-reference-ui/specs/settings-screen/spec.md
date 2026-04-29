## ADDED Requirements

### Requirement: Settings screen has four groups: Account, Appearance, Notifications, Data
The system SHALL render four labeled setting groups. Each group contains rows of label + value + optional control (toggle, button, or custom UI).

#### Scenario: All four groups are visible
- **WHEN** the Settings screen renders
- **THEN** Account, Appearance, Notifications, and Data section headers are present

### Requirement: Theme toggle switches between light and dark mode
The system SHALL render Light and Dark buttons. Clicking one sets `data-theme` on `<html>` immediately.

#### Scenario: Clicking Dark switches to dark mode
- **WHEN** the user clicks the Dark button
- **THEN** `data-theme="dark"` is applied to the document root and the UI re-themes

### Requirement: Accent color picker has four preset hues
The system SHALL offer Ochre (60), Sage (145), Slate (240), and Plum (340) buttons. Clicking one updates `--accent` on `<html>`.

#### Scenario: Clicking Sage sets hue 145
- **WHEN** the user clicks the Sage button
- **THEN** `--accent` is updated to `oklch(62% 0.13 145)`

### Requirement: Data section offers JSON export and history reset
The system SHALL render "Download JSON" and "Reset…" buttons. Export downloads the full store state as a JSON file. Reset clears localStorage and reloads with sample data.

#### Scenario: Download JSON triggers a file download
- **WHEN** the user clicks "Download JSON"
- **THEN** a file named `atomic-habits-export.json` is downloaded with the full store contents
