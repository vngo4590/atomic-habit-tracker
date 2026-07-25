## 1. Branch & orient

- [x] 1.1 Create branch `fix/helptip-mobile-overflow` from an up-to-date base.
- [x] 1.2 Re-read `components/HelpTip.tsx`, `components/HelpTip.module.css`, and the two usages in
      `app/(root)/habits/new/page.tsx` (header tip + cap-reached banner tip) to confirm scope.

## 2. Constrain popover width (CSS)

- [x] 2.1 In `components/HelpTip.module.css`, change `.popover` `max-width` so it can never exceed
      the viewport, e.g. `max-width: min(260px, calc(100vw - 16px));`, keeping `white-space: normal`
      so text wraps. Add/keep a comment explaining the visual purpose.
- [x] 2.2 Update the `.popover` transform to consume a shift variable:
      `transform: translateX(calc(-50% + var(--tip-shift, 0px)));` with a comment.

## 3. Clamp popover into the viewport (JS)

- [x] 3.1 In `components/HelpTip.tsx`, add a `popoverRef` on the popover `<span>` and a state/ref
      holding the horizontal shift in px (default 0).
- [x] 3.2 In a `useLayoutEffect` gated on `open`, measure the popover's `getBoundingClientRect()`
      and `window.innerWidth`; compute a correction so its left/right edges stay within an 8px
      margin (shift right if `left < margin`, shift left if `right > innerWidth - margin`).
- [x] 3.3 Apply the computed shift to the popover via the `--tip-shift` CSS variable (dynamic
      CSS-variable passthrough — add the required inline comment explaining why it is allowed).
- [x] 3.4 Recompute on `resize` and `scroll` while open; attach listeners only while open and
      remove them on close (mirror the existing Escape/outside-click effect lifecycle).
- [x] 3.5 Keep all existing behaviour intact: click/tap toggle, `aria-expanded`, `aria-describedby`,
      Escape and outside-pointer dismissal, non-submitting `type="button"`.

## 4. Affordance clarity

- [x] 4.1 Confirm the trigger reads as interactive on touch (pointer cursor + visible focus ring);
      do NOT add hover-only reveal. Adjust only if the affordance is unclear.

## 5. Tests

- [x] 5.1 In `components/__tests__/HelpTip.test.tsx`, add a test that stubs
      `Element.prototype.getBoundingClientRect` and `window.innerWidth` to force a right-edge
      overflow, opens the tip, and asserts the popover receives a non-zero corrective `--tip-shift`
      (moves it back inside).
- [x] 5.2 Add a test asserting the popover still opens/reveals the caller text and closes on
      Escape/outside click after the positioning change (guard against regressions).
- [x] 5.3 Ensure existing HelpTip tests still pass unchanged.

## 6. Validate

- [x] 6.1 `npm exec vitest run components/__tests__/HelpTip.test.tsx`
- [x] 6.2 `npm run typecheck`
- [x] 6.3 `npm run lint:app`
- [x] 6.4 `npm run build`
- [ ] 6.5 Manual check: on `/habits/new` at the 3-active-habit cap, using a narrow/mobile viewport
      (DevTools device mode), open both the header tip and the cap-banner tip and confirm neither
      popover is clipped by the screen edge. (Optional: capture as a Playwright check.)

## 7. Wrap up

- [x] 7.1 Update `README.md` / `AGENTS.md` only if HelpTip behaviour docs need it (likely not).
- [x] 7.2 Commit with a Conventional Commit (`fix(help-tip): keep popover within viewport on
      mobile`) including the Copilot co-author trailer; push the branch.
- [ ] 7.3 Archive this OpenSpec change once implemented and validated.
