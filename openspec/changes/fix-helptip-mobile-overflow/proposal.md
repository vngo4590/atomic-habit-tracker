## Why

On narrow (mobile) viewports, the `HelpTip` "?" popover overflows the screen edge and its
explanatory text is clipped and unreadable. This is most visible on `/habits/new` when the
user is at the 3-active-habit cap: the header tip and the "cap reached" banner tip both open a
popover that spills off-screen. The control also only opens on click/tap — never on hover — so
users who expect a hover tooltip see nothing, compounding the impression that the tip is broken.

## What Changes

- Make the `HelpTip` popover **viewport-safe**: on any screen width it stays fully within the
  visible viewport (with a small margin) instead of overflowing and being clipped at the edge.
- Ensure the popover text remains readable on small screens by constraining its width to the
  available space rather than a fixed `max-width` that can exceed the viewport.
- Clarify the open affordance so it is obvious the tip opens on click/tap (not hover), keeping
  the existing accessible, keyboard-operable, Escape-dismissable behaviour intact.
- Add regression coverage for the viewport-safe positioning behaviour.

No breaking changes: the public `HelpTip` props (`children`, `label`, `className`) and its
accessibility contract are unchanged.

## Capabilities

### New Capabilities

<!-- None: this refines an existing capability. -->

### Modified Capabilities

- `help-tip`: Add a requirement that the revealed popover stays within the viewport on all
  screen sizes (never clipped by the screen edge on mobile), and make the click/tap open
  affordance explicit.

## Impact

- `components/HelpTip.tsx` — popover positioning logic (viewport-aware offset).
- `components/HelpTip.module.css` — popover width/placement rules for narrow screens.
- `components/__tests__/HelpTip.test.tsx` — new regression test(s).
- Surfaces that render `HelpTip`, primarily `app/(root)/habits/new/page.tsx` (header tip and
  cap-reached banner tip). No changes to the cap logic itself.
- No dependency, API, or data-model changes.
