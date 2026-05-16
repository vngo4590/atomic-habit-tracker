import type { Transition, Variants } from "framer-motion";

export const spring = {
  gentle: { type: "spring", stiffness: 120, damping: 14 } as const,
  snappy: { type: "spring", stiffness: 300, damping: 25 } as const,
  bouncy: { type: "spring", stiffness: 400, damping: 15 } as const,
  stiff: { type: "spring", stiffness: 500, damping: 30 } as const,
};

export const ease = {
  smooth: [0.4, 0, 0.2, 1] as const,
  enter: [0, 0, 0.2, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
};

export const duration = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  slower: 0.6,
};

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: ease.smooth },
  },
};

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.base, ease: ease.smooth },
  },
};

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.slow, ease: ease.smooth },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: duration.fast, ease: ease.exit },
  },
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: ease.smooth },
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { duration: duration.fast, ease: ease.exit },
  },
};

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: ease.smooth },
  },
};

export const navItemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.base, ease: ease.smooth },
  },
};

export const sidebarStagger: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.1 },
  },
};

export const toastVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: spring.gentle,
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.98,
    transition: { duration: duration.fast, ease: ease.exit },
  },
};

export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.base },
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.fast },
  },
};

export const overlayCardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 24 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: spring.gentle,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 12,
    transition: { duration: duration.fast, ease: ease.exit },
  },
};

export const pageTransition: Transition = {
  duration: duration.slow,
  ease: ease.smooth,
};
