# ADR-0003: Token-based design system, calm-minimal, light + dark only

- Status: Accepted
- Date: 2026-11-27

## Context

The UI ships six named themes (light, dark, glass, neon, fairy, stars), a
760-line global `components.css`, a 445-line `responsive.css`, and ad-hoc
per-page styles. Each theme multiplies visual QA and contrast risk, and the
global partials leak styles across features.

The product owner chose a calm, minimal direction (soft neutrals, generous
whitespace), only light and dark themes, and a simpler navigation:
Today / Habits / Reflect (Journal + Review) / Insights (Analytics + Hall of
Fame) / Pet / Settings.

## Decision

- Semantic design tokens in `app/styles/tokens.css` cover colour roles, type
  scale, spacing, radius, elevation and motion. They have exactly two theme
  values: `light` and `dark`.
- A `shared/ui` primitive kit (Button, Card, Field, Sheet, Tabs, EmptyState,
  Skeleton, etc.) owns component styling via CSS Modules. Global CSS is limited
  to tokens, reset/base and typography.
- Stored legacy theme preferences map to the nearest supported theme:
  `glass` and `fairy` become `light`; `neon` and `stars` become `dark`. No data
  migration is required.
- Accessibility is part of the design: 4.5:1 text contrast, visible focus,
  44 px touch targets, `prefers-reduced-motion` respected, and labelled icon
  buttons.

## Consequences

- Less CSS, fewer cross-feature style leaks, and half the visual QA matrix.
- Users on a removed theme see a visual change; this is accepted product scope.
- Redirects keep old routes (`/journal`, `/review`, `/analytics`,
  `/hall-of-fame`) working as deep links.
