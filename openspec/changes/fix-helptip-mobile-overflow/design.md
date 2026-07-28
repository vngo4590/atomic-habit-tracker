## Context

`HelpTip` (`components/HelpTip.tsx` + `HelpTip.module.css`) renders a round "?" trigger that
toggles a short explanatory popover on click/tap. The popover is styled with:

```css
.popover {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: 260px;
}
```

It is centered horizontally over the trigger. When the trigger sits near a viewport edge — which
happens on `/habits/new` in the header (`Design a small vote ?`) and in the cap-reached banner —
the centered, fixed-width popover extends past the screen edge on narrow (mobile) viewports and
its text is clipped and unreadable. Pure CSS centering cannot know how close the trigger is to the
edge, so width constraints alone do not fix it. Separately, the tip only opens on click/tap (never
hover), so users expecting a hover tooltip perceive it as broken.

Repo constraints: CSS Modules + `app/styles/` partials; **no inline `style={{}}` for static
layout/colour**, but **dynamic CSS-variable passthrough is explicitly allowed** (with a comment).
Unit tests run under jsdom, which does not perform layout (`getBoundingClientRect` returns zeros).

## Goals / Non-Goals

**Goals:**
- The open popover always stays fully within the viewport on every screen width, with a small
  margin from the left/right edges; text is never clipped.
- The popover width adapts to viewports narrower than its preferred width.
- Preserve the existing accessibility contract (labelled non-submitting button, `aria-expanded`,
  `aria-describedby`, Escape/outside-click dismissal) and public props.
- Keep the fix inside the reusable `HelpTip` so every usage benefits, not just `/habits/new`.

**Non-Goals:**
- Converting the tip to a hover-reveal tooltip (hover is unreliable/inaccessible on touch).
- Adding a positioning/popover library (e.g. Floating UI) — overkill for one small control.
- Redesigning the popover's visual style, caret, or the cap banner layout.
- Changing any active-habit cap logic.

## Decisions

### Decision 1: Keep the popover anchored to the trigger, but clamp it into the viewport in JS

Chosen approach: on open, measure the popover's natural (centered) rect and the viewport width,
compute a horizontal correction so the popover stays within an 8px edge margin, and expose it to
CSS as a `--tip-shift` custom property. The CSS transform becomes
`translateX(calc(-50% + var(--tip-shift, 0px)))`. Recompute on `resize`/`scroll` while open;
tear down listeners on close. Measurement runs in `useLayoutEffect` so the corrected position is
applied before paint (no visible jump).

Also constrain width so it can never exceed the viewport:
`max-width: min(260px, calc(100vw - 16px))`.

Passing the offset as a CSS variable follows the repo's "dynamic CSS-variable passthrough" rule
(annotated with a comment), so the module class still owns all static styling.

**Alternatives considered:**
- *CSS-only width clamp* (`max-width: min(260px, calc(100vw - 16px))` alone): necessary but not
  sufficient — a narrower popover centered over an edge-adjacent trigger still overflows.
- *CSS Anchor Positioning* (`position-try`, `position-area`): elegant and JS-free, but browser
  support (notably Safari) is not universal for the app's targets; risky for a bug fix.
- *Floating UI / Popper*: robust but adds a dependency and bundle weight for one tiny control.
- *`position: fixed`, screen-centered*: detaches the popover from its trigger, changing the design
  and hurting the visual association.

### Decision 2: Keep click/tap as the canonical open; make the affordance obvious, do not add hover

The trigger already toggles on click, which works on both desktop and touch. We keep that and
ensure the control reads as interactive (pointer cursor, focus ring). We deliberately do **not**
add hover-only reveal because it is inaccessible on touch and keyboard. The spec documents
tap-to-open so the expectation is explicit.

### Decision 3: Test what jsdom can observe; verify pixels manually / via Playwright

Because jsdom has no layout, unit tests assert the *mechanism*: opening still reveals the popover,
the popover carries the positioning style hook (`--tip-shift`), and the clamp code runs without
error when `getBoundingClientRect`/`innerWidth` are stubbed to force an overflow (the computed
shift moves the popover back inside). True on-screen verification at mobile widths is a manual /
optional Playwright check, noted in tasks but not required for the unit gate.

## Risks / Trade-offs

- **jsdom cannot validate real positioning** → Mitigate by stubbing `getBoundingClientRect` and
  `window.innerWidth` in a unit test to exercise the clamp math, plus a manual mobile check.
- **Scroll/resize listeners while open add a little overhead** → Mitigate by only attaching them
  while the popover is open and removing them on close (same lifecycle as the existing Escape /
  outside-click listeners).
- **Very narrow viewports (< ~200px)** may leave little room → Mitigate with the `min()` width
  clamp so text wraps within the available space rather than overflowing.
- **Measuring in `useLayoutEffect`** runs synchronously before paint → acceptable for a tiny,
  on-demand element; avoids a visible reposition flicker.

## Migration Plan

Not applicable — self-contained UI fix with no data, API, or dependency changes. Rollback is a
straight revert of the `HelpTip` component/style/test edits.

## Open Questions

- None blocking. Optional follow-up: if more surfaces adopt richer popovers later, revisit whether
  a shared positioning hook or CSS Anchor Positioning (once support is universal) should replace
  the JS clamp.
