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

## Core Primitives (`components/motion/`)

| Component | Purpose |
|-----------|---------|
| `FadeIn` | Wrapper for fade + translateY entrance on mount |
| `FadeInView` | Fade-in when element scrolls into viewport |
| `StaggerContainer` | Parent that staggers children entrance |
| `StaggerItem` | Child item for staggered lists |
| `SlideIn` | Directional slide entrance |
| `ScaleOnTap` | Button/link micro-interaction (scale down on tap) |
| `PageTransition` | `AnimatePresence` wrapper for route changes |
| `HoverLift` | Card hover elevation (translateY + shadow) |
| `AnimatedNumber` | Count-up animation for stat values |

## Shared Config (`lib/animations.ts`)

```ts
import { spring, ease, duration, fadeUpVariants, staggerContainerVariants, toastVariants, overlayVariants } from "@/lib/animations";
```

- **Springs**: `gentle`, `snappy`, `bouncy`, `stiff`
- **Easing**: `smooth` `[0.4,0,0.2,1]`, `enter`, `exit`, `bounce`
- **Durations**: `fast` 0.15s, `base` 0.25s, `slow` 0.4s, `slower` 0.6s
- **Variants**: `fadeUpVariants`, `scaleInVariants`, `slideUpVariants`, `staggerItemVariants`, `navItemVariants`, `toastVariants`, `overlayVariants`

## Design Tokens (`globals.css`)

- `--shadow-sm/md/lg/xl` — refined depth system
- `--transition-fast/base/slow` — consistent easing
- `.glass` — backdrop-blur glassmorphism utility
- `.skeleton` — shimmer loading placeholder
- `.focus-ring` — modern focus outline with accent ring

## Patterns

### Page Entrance
```tsx
<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}>
  {/* page content */}
</motion.div>
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
<motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
  Action
</motion.button>
```

### Card Hover Lift
```tsx
<motion.div whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
  <div className="card card-pad">...</div>
</motion.div>
```

### Progress Bar Animation
```tsx
<motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }} />
```

### Overlay Entrance
```tsx
<motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="exit">
  <motion.div variants={overlayCardVariants} ...>
    {/* modal content */}
  </motion.div>
</motion.div>
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
| Focus ring transitions | Page/route transitions |
| Border/shadow hover on single elements | Staggered list reveals |
| | Scroll-triggered animations |
| | Animated numbers/count-ups |
| | Layout animations (tabs, active indicators) |
