"use client";

import { motion, type TargetAndTransition, type Transition } from "framer-motion";

import type { MoodAnimation, Sprite } from "@/lib/pet";

import { PixelSprite } from "./PixelSprite";
import styles from "./MoodSprite.module.css";

/**
 * MoodSprite draws a pet's pixel art and gives it a looping idle animation that
 * matches its mood — a hungry pet slumps, a happy one bounces, a lovestruck one
 * floats with hearts, a dead one greys out and goes still. This is what makes
 * the creatures feel alive and gives emotional feedback on how well they are
 * being cared for.
 *
 * Animation values live inline because they are Framer Motion motion values, not
 * static styling (per the project's inline-style policy).
 */

/** Per-mood idle loop definitions (transform + opacity only, for performance). */
const ANIMATIONS: Record<MoodAnimation, { animate: TargetAndTransition; transition: Transition }> = {
  // Dead: no motion, just a still, greyed-out sprite (handled via className too).
  none: { animate: {}, transition: {} },
  // Sick: a small uneasy tremble.
  shiver: { animate: { x: [-1, 1, -1] }, transition: { duration: 0.3, repeat: Infinity } },
  // Hungry: a slow, heavy slump.
  slump: { animate: { y: [0, 2, 0] }, transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } },
  // Content: a calm breathing bob.
  bob: { animate: { y: [0, -3, 0] }, transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" } },
  // Sleeping: a gentle side-to-side sway.
  sway: { animate: { rotate: [-2, 2, -2] }, transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" } },
  // Happy: a springy bounce.
  bounce: { animate: { y: [0, -6, 0] }, transition: { duration: 1.3, repeat: Infinity, ease: "easeInOut" } },
  // Excited: an energetic jump with a little squash-and-stretch.
  jump: { animate: { y: [0, -12, 0], scale: [1, 1.06, 1] }, transition: { duration: 0.75, repeat: Infinity } },
  // In love: a dreamy float.
  float: { animate: { y: [0, -5, 0] }, transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } },
};

export function MoodSprite({
  sprite,
  label,
  animation,
  pixelSize = 16,
  showHearts = false,
}: {
  /** The pixel art to render. */
  sprite: Sprite;
  /** Accessible label describing the creature and its mood. */
  label: string;
  /** Which idle loop to play (from the pet's mood). */
  animation: MoodAnimation;
  /** Edge length of a single pixel cell. */
  pixelSize?: number;
  /** Whether to float little hearts (used for the "in love" mood). */
  showHearts?: boolean;
}) {
  const motionProps = ANIMATIONS[animation];
  const isDead = animation === "none";

  return (
    <div className={styles.wrap}>
      {showHearts ? (
        <div className={styles.hearts} aria-hidden="true">
          <motion.span
            className={styles.heart}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], y: -24 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          >
            ♥
          </motion.span>
          <motion.span
            className={`${styles.heart} ${styles.heartRight}`}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], y: -30 }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
          >
            ♥
          </motion.span>
        </div>
      ) : null}

      <motion.div
        className={isDead ? styles.dead : undefined}
        animate={motionProps.animate}
        transition={motionProps.transition}
      >
        <PixelSprite sprite={sprite} label={label} pixelSize={pixelSize} />
      </motion.div>
    </div>
  );
}
