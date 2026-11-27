# Atomicly Design System — MASTER

Source of truth for all UI. Page overrides live in `pages/<page>.md` (only when needed).
Derived from ui-ux-pro-max (style: Minimalism & Swiss; typography "Friendly SaaS";
palette adapted from "Minimal black + accent" toward warm neutral + sage per product
owner's "calm minimal, soft neutrals" brief). ADR-0003.

## Principles
1. **One thing per screen.** Each screen has one primary action, visually dominant.
2. **Calm by default.** Neutral surfaces, one accent colour, no gradients/glows/glass.
3. **Whitespace is structure.** Group with spacing before borders; borders before shadows.
4. **Progressive disclosure.** Show the essential; reveal advanced (4 Laws, contract, stacking) on demand.
5. **Accessible always.** 4.5:1 text contrast, visible focus, 44px targets, reduced-motion.

## Typography
- Family: **Plus Jakarta Sans** (single family, `next/font/google`, `display: swap`), weights 400/500/600/700.
  Numbers: `font-variant-numeric: tabular-nums` for stats/streaks.
- Scale (rem): xs .75 · sm .875 · base 1 · lg 1.125 · xl 1.25 · 2xl 1.5 · 3xl 1.875 · 4xl 2.25
- Line height: body 1.55, headings 1.2. Letter-spacing headings -0.01em.
- Body minimum 16px on mobile inputs (prevents iOS zoom).

## Colour tokens (semantic; components never use raw hex)
Accent is user-tunable via `--accent-hue` (default 160 = sage). OKLCH keeps perceived
lightness constant so contrast holds for any hue.

| Token | Light | Dark |
|---|---|---|
| --bg | #FAFAF9 | #0F0F0E |
| --surface | #FFFFFF | #1A1A18 |
| --surface-2 (muted fill) | #F5F5F4 | #242422 |
| --border | #E7E5E4 | #2E2E2B |
| --border-strong | #D6D3D1 | #3F3F3B |
| --text | #1C1917 | #F5F5F4 |
| --text-muted | #57534E | #A8A29E |
| --text-subtle | #78716C | #8A8580 |
| --primary | oklch(0.48 0.09 var(--accent-hue)) | oklch(0.80 0.09 var(--accent-hue)) |
| --on-primary | #FFFFFF | #0F0F0E |
| --primary-soft | oklch(0.95 0.03 var(--accent-hue)) | oklch(0.30 0.04 var(--accent-hue)) |
| --success | = --primary | = --primary |
| --warning | #B45309 | #F59E0B |
| --danger | #B91C1C | #F87171 |
| --ring | = --primary | = --primary |

## Spacing (4px base)
`--space-1` 4 · 2: 8 · 3: 12 · 4: 16 · 5: 20 · 6: 24 · 8: 32 · 10: 40 · 12: 48 · 16: 64.
Page gutter: 16 (mobile) / 32 (≥768) / 48 (≥1200). Max content width 1080px; reading width 680px.

## Shape & elevation
Radius: sm 8 · md 12 · lg 16 · full 999. Cards = md, sheets = lg (top corners on mobile).
Shadow: only `--shadow-sm` (0 1px 2px rgb(0 0 0 / .05)) for cards and `--shadow-lg` for overlays.

## Motion (Framer Motion, lib/animations.ts)
Durations: fast 150ms (hover/press), base 220ms (state), slow 320ms (enter). Exits ~70% of enters.
Springs for tactile (check toggle, tap). Stagger lists 40–60ms. Always honour `prefers-reduced-motion`
(render final state). Animate transform/opacity only.

## Layout & navigation
- Desktop (≥1024): left sidebar 240px — Today, Habits, Reflect, Insights, Pet, Settings (+ Identity in Settings/Habits header).
- Mobile (<1024): top bar (title + primary action) + bottom tab bar (5 items: Today, Habits, Reflect, Insights, Pet); Settings via avatar/top bar.
- Reflect = tabs [Journal | Weekly review]; Insights = tabs [Analytics | Hall of Fame]. Old routes redirect / remain deep-linkable.

## Components (components/ui)
Button (primary / secondary / ghost / danger; sm/md; loading), IconButton (aria-label required),
Card, Field (label + hint + error, ids wired), TextArea, Select, Switch, Tabs (roving tabindex),
Sheet/Modal (focus trap, Esc, return focus), EmptyState (icon + title + text + CTA), Skeleton,
Badge, ProgressRing, Toast (aria-live polite), PageHeader (title, subtitle, actions).

## Icons
Lucide only, 20px default, stroke 1.75; decorative icons `aria-hidden`. No emoji as UI icons
(user-chosen habit emoji are content, allowed).

## States
Every list: empty state with a CTA; loading skeleton matching final layout (no CLS);
inline error near the field; destructive actions confirm.

## Pre-delivery checklist
- [ ] 375 / 768 / 1024 / 1440 widths, no horizontal scroll
- [ ] Light + dark contrast ≥ 4.5:1 text, ≥ 3:1 UI
- [ ] Keyboard: tab order, visible focus, Esc closes overlays
- [ ] Touch targets ≥ 44px; hover not required
- [ ] Reduced motion honoured
- [ ] No raw hex / inline static styles in components
