"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { MAX_PARTICLES, createParticles, type ClickParticle } from "@/lib/click-fx";
import { getTheme } from "@/lib/themes";

import styles from "./ClickFX.module.css";

// Read the OS "reduce motion" setting at click time so we never play
// decorative effects for users who asked for stillness.
function prefersReducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

/**
 * ClickFX — a single, app-wide layer that plays a small animation wherever the
 * user clicks. The animation style follows the active theme: a soft ripple for
 * the plain themes, rising bubbles for Glass, and sparkling stars for the
 * decorative themes (Neon/Fairy/Starlight).
 *
 * It is mounted once near the root so every screen gets the feedback for free.
 * The overlay never intercepts pointer events, and the whole effect is skipped
 * for users who prefer reduced motion.
 */
export function ClickFX() {
  const [particles, setParticles] = useState<ClickParticle[]>([]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      // Only react to a primary (left / single-finger) press, and never when
      // reduced motion is requested.
      if (event.button !== 0 || !event.isPrimary || prefersReducedMotion()) {
        return;
      }

      const effect = getTheme(document.documentElement.dataset.themeVariant).clickEffect;
      const batch = createParticles(effect, event.clientX, event.clientY);
      if (batch.length === 0) {
        return;
      }

      // Append, then keep only the most recent particles so spamming clicks
      // can never balloon the DOM beyond the safety cap.
      setParticles((prev) => [...prev, ...batch].slice(-MAX_PARTICLES));
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  // Drop a particle from state once its exit/finish animation completes.
  const remove = (id: string) =>
    setParticles((prev) => prev.filter((particle) => particle.id !== id));

  return (
    <div className={styles.layer} aria-hidden="true">
      <AnimatePresence>
        {particles.map((particle) => (
          <span
            key={particle.id}
            className={styles.anchor}
            /* Dynamic click coordinates — must be inline (per-particle data). */
            style={{ left: particle.x, top: particle.y }}
          >
            <Particle particle={particle} onDone={() => remove(particle.id)} />
          </span>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Renders one particle and animates it according to its effect type. */
function Particle({ particle, onDone }: { particle: ClickParticle; onDone: () => void }) {
  const sizeStyle = { width: particle.size, height: particle.size } as const;

  if (particle.effect === "ripple") {
    return (
      <motion.span
        className={styles.ripple}
        style={sizeStyle}
        initial={{ scale: 0, opacity: 0.45 }}
        animate={{ scale: 1, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        onAnimationComplete={onDone}
      />
    );
  }

  if (particle.effect === "bubble") {
    return (
      <motion.span
        className={styles.bubble}
        style={sizeStyle}
        initial={{ opacity: 0.6, scale: 0.5, x: 0, y: 0 }}
        animate={{ opacity: 0, scale: 1, x: particle.dx, y: particle.dy }}
        transition={{ duration: 0.85, ease: "easeOut" }}
        onAnimationComplete={onDone}
      />
    );
  }

  // sparkle
  return (
    <motion.span
      className={styles.sparkle}
      style={sizeStyle}
      initial={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
      animate={{ opacity: 0, scale: 0.2, x: particle.dx, y: particle.dy, rotate: particle.rotate }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      onAnimationComplete={onDone}
    />
  );
}
