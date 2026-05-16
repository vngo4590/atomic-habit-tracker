"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { staggerItemVariants } from "@/lib/animations";
import { useMotionReduced } from "@/lib/hooks/useMotionReduced";

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
}: StaggerContainerProps) {
  const reduced = useMotionReduced();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
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

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={staggerItemVariants}>
      {children}
    </motion.div>
  );
}
