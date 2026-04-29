# design-tokens Specification

## Purpose
TBD - created by archiving change port-reference-ui. Update Purpose after archive.
## Requirements
### Requirement: Global CSS custom properties define the visual system
The system SHALL define all colors, typography, spacing, and radius values as CSS custom properties in `app/globals.css` so that all components can reference them uniformly.

#### Scenario: Light theme tokens are applied by default
- **WHEN** the page loads with no theme override
- **THEN** `--bg`, `--ink`, `--accent`, and all palette tokens resolve to the warm-paper light theme values (oklch-based)

#### Scenario: Dark theme tokens activate on `data-theme="dark"`
- **WHEN** `data-theme="dark"` is set on `<html>`
- **THEN** all `--bg`, `--ink`, `--rule`, and `--accent-soft` tokens resolve to the dark palette overrides

### Requirement: Typography uses three font families via CSS variables
The system SHALL expose `--font-serif` (Instrument Serif), `--font-sans` (Inter Tight), and `--font-mono` (JetBrains Mono) as CSS custom properties, loaded via `next/font/google`.

#### Scenario: Serif font renders on headings
- **WHEN** an element uses `font-family: var(--font-serif)`
- **THEN** text renders in Instrument Serif with correct weight and optical sizing

#### Scenario: Mono font renders on labels and stats
- **WHEN** an element uses `font-family: var(--font-mono)`
- **THEN** text renders in JetBrains Mono at the configured size

### Requirement: Accent color is adjustable via a CSS variable
The system SHALL use a single `--accent` CSS custom property (oklch) for all accent elements, so that changing its hue updates the entire UI.

#### Scenario: Default accent is ochre (hue 60)
- **WHEN** no accent override is set
- **THEN** `--accent` resolves to `oklch(62% 0.13 60)` (ochre)

#### Scenario: Accent hue change propagates everywhere
- **WHEN** `--accent` is overridden with a new hue value on `<html>`
- **THEN** all buttons, active tabs, streak pills, chart lines, and identity markers reflect the new color without any component code changes

