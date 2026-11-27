---
name: atomic-habit-ui-animation
description: Reusable animation patterns and conventions for the Atomicly habit tracker UI. Use when adding motion to pages or components, creating entrance/hover/tap interactions, implementing page transitions, staggered lists, or scroll-triggered reveals. Covers Framer Motion primitives in `components/motion/`, shared spring/easing/duration configs in `lib/animations.ts`, and when to prefer Framer Motion over CSS transitions.
---

# Atomicly UI Animation Skill

## Purpose
Reusable animation patterns and conventions for the Atomicly habit tracker UI.

## When to Use
- Adding motion to new pages or components
- Creating interactive elements that need entrance, hover, or tap feedback
- Implementing page transitions, staggered lists, or scroll-triggered reveals

## Dependencies
- `framer-motion` — primary animation library
- `lucide-react` — iconography (re-exported via `components/Icons.tsx`)

## Bundle rule: `m`, not `motion` (LazyMotion)

`app/(root)/layout.tsx` wraps the app in `components/motion/MotionProvider.tsx`
(`LazyMotion` + async `domAnimation` from `motion-features.ts`). Always write
`import { m } from "framer-motion"` and `<m.div>`; importing `motion` pulls the
full ~30 KB engine into the route's first load. `m.*` outside the provider never
animates and stays at its `initial` state, so do not use it on `(auth)` pages.
Keep the app shell (layout, nav, `Toast`, `PageTransition`) Framer-free: use CSS
keyframes in `app/styles/animations.css` there. Only `Reorder` (StackDiagram)
uses the full build. `npm run bundle:check` enforces a 230 KB first-load budget.

**Fallback.** `MotionProvider` retries the feature chunk once; if it still
fails it adds `motion-unavailable` to `<html>` (and logs
`motion.features_failed`), and `app/styles/animations.css` forces inline
`opacity`/`transform` back to visible so content never stays hidden at its
`initial` state.

**Reduced motion.** CSS durations collapse via `tokens.css` under
`prefers-reduced-motion`. Framer components must opt in themselves: feature
components use `useReducedMotion()` from `framer-motion` to skip or shorten
motion; the `StaggerContainer` primitive uses `lib/hooks/useMotionReduced.ts`
(reduced motion **or** narrow viewport). Never let essential state changes
depend on an animation finishing.

For tokens, theming and the a11y bar see `atomic-habit-design-system`.

## Core Primitives (`components/motion/`)

| Component | Purpose |
|-----------|---------|
| `FadeIn` | Wrapper for fade + translateY entrance on mount |
| `FadeInView` | Fade-in when element scrolls into viewport |
| `StaggerContainer` | Parent that staggers children entrance |
| `StaggerItem` | Child item for staggered lists |
| `SlideIn` | Directional slide entrance |
| `ScaleOnTap` | Button/link micro-interaction (scale down on tap) |
| `PageTransition` | CSS `page-enter` fade keyed on the pathname (no Framer, keeps the shell light) |
| `HoverLift` | Card hover elevation (translateY + shadow) |
| `AnimatedNumber` | Count-up animation for stat values |

## Shared Config (`lib/animations.ts`)

```ts
import { spring, ease, duration, fadeUpVariants, staggerContainerVariants, overlayVariants } from "@/lib/animations";
```

- **Springs**: `gentle`, `snappy`, `bouncy`, `stiff`
- **Easing**: `smooth` `[0.4,0,0.2,1]`, `enter`, `exit`, `bounce`
- **Durations**: `fast` 0.15s, `base` 0.25s, `slow` 0.4s, `slower` 0.6s
- **Variants**: `fadeUpVariants`, `fadeInVariants`, `scaleInVariants`, `slideUpVariants`, `staggerContainerVariants`, `staggerItemVariants`, `overlayVariants`, `overlayCardVariants`

## Design Tokens (`app/styles/tokens.css`, `app/styles/animations.css`)

- `--duration-fast` 150ms / `--duration-base` 220ms / `--duration-slow` 320ms + `--ease-standard` — CSS transition timings (collapse to 0.01ms under reduced motion)
- `--shadow-sm` / `--shadow-lg` — the only two elevations (`--shadow-md/xl` and `--transition-*` are legacy aliases; don't use them in new code)
- `.fade-up`, `.skeleton` (shimmer placeholder), `page-enter` — CSS animation utilities
- Focus styling is the global `:focus-visible` rule in `base.css` + the `--focus-ring` token (there is no `.focus-ring` or `.glass` class)

## Patterns

### Page Entrance
```tsx
<m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}>
  {/* page content */}
</m.div>
```

### Staggered List
```tsx
<StaggerContainer staggerDelay={0.04}>
  {items.map((item) => (
    <StaggerItem key={item.id}>
      <HabitRow ... />
    </StaggerItem>
  ))}
</StaggerContainer>
```

### Button Micro-interactions
```tsx
<m.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
  Action
</m.button>
```

### Card Hover Lift
```tsx
<m.div whileHover={{ y: -2, boxShadow: "var(--shadow-lg)" }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
  <div className="card card-pad">...</div>
</m.div>
```

### Progress Bar Animation
```tsx
<m.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }} />
```

### Overlay Entrance
```tsx
<m.div variants={overlayVariants} initial="hidden" animate="visible" exit="exit">
  <m.div variants={overlayCardVariants} ...>
    {/* modal content */}
  </m.div>
</m.div>
```

## Performance Guidelines

1. Animate only `transform` and `opacity` for 60fps
2. Use `layout` prop sparingly — it triggers layout recalculation
3. Prefer `whileInView` with `viewport={{ once: true }}` over scroll listeners
4. Use `will-change: transform` on heavily animated elements (already set by Framer Motion)
5. Avoid animating `width`/`height` on large lists — use `scale` or `opacity` instead

## CSS vs Framer Motion Decision Tree

| Use CSS | Use Framer Motion |
|---------|-------------------|
| Simple hover background/color changes | Entrance/exit animations |
| Static keyframe loops (e.g., float) | Gesture interactions (tap, drag, pan) |
| Focus ring transitions | Staggered list reveals |
| Border/shadow hover on single elements | Scroll-triggered animations |
| App shell + route fade (`page-enter`) | Animated numbers/count-ups |
| | Layout animations (tabs, active indicators) |
