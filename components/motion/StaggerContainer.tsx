"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { staggerItemVariants } from "@/lib/animations";
import { useMotionReduced } from "@/lib/hooks/useMotionReduced";
import { useMounted } from "@/lib/hooks/useMounted";

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  delayChildren?: number;
  style?: React.CSSProperties;
}

export function StaggerContainer({
  children,
  className,
  style,
}: StaggerContainerProps) {
  const reduced = useMotionReduced();
  const mounted = useMounted();

  // Render a plain div during SSR and hydration so the server and client
  // produce identical markup. After hydration completes we switch to the
  // animated motion.div so entrance animations can run.
  if (!mounted || reduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      variants={{
        hidden: { opacity: 1 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.05, delayChildren: 0.05 },
        },
      }}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  const reduced = useMotionReduced();
  const mounted = useMounted();

  // Same SSR-safe guard: plain div during hydration, motion.div after.
  if (!mounted || reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={staggerItemVariants}>
      {children}
    </motion.div>
  );
}
