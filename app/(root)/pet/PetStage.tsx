"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";

import { PixelSprite } from "@/components/pet/PixelSprite";
import { MAX_SATIETY } from "@/lib/pet";

import type { UsePetResult } from "@/lib/hooks/usePet";
import styles from "./page.module.css";

/**
 * PetStage is the main view once a companion has been adopted. It shows the pet's
 * pixel art reacting to its mood, a satiety bar, today's stats, and the Feed
 * button. Feeding is only possible while there are unspent food tokens (one per
 * habit completed today), so the stage quietly ties the game back to real habits.
 */
export function PetStage({
  pet,
  onChangeCompanion,
}: {
  pet: UsePetResult;
  onChangeCompanion: () => void;
}) {
  const { character } = pet;
  if (!character) {
    return null;
  }

  // Dynamic width passthrough: the fullness bar reflects today's satiety ratio,
  // which is data-driven, so it must be an inline style rather than a class.
  const fillStyle = { width: `${Math.round(pet.satietyRatio * 100)}%` } as CSSProperties;

  return (
    <div className={styles.stage}>
      <section className="card card-pad">
        <div className={styles.stageTop}>
          <div>
            <div className="eyebrow">Your companion</div>
            <h2 className={styles.petName}>{character.name}</h2>
            <div className={styles.petPersonality}>{character.personality}</div>
          </div>
          <button type="button" className="btn btn-sm" onClick={onChangeCompanion}>
            Change
          </button>
        </div>

        {/* The sprite pops each time the feed count changes, giving feeding a
            satisfying bit of life. Keyed on feedsToday so the animation replays. */}
        <div className={styles.spriteFrame}>
          <motion.div
            key={pet.feedsToday}
            initial={{ scale: 0.9 }}
            animate={{ scale: [0.9, 1.08, 1] }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <PixelSprite character={character} pixelSize={22} />
          </motion.div>
        </div>

        <div className={styles.moodRow}>
          <span className={styles.moodFace} aria-hidden="true">
            {pet.mood.face}
          </span>
          <span className={styles.moodLabel}>{pet.mood.label}</span>
        </div>

        <div
          className={styles.satietyTrack}
          role="meter"
          aria-label="Satiety"
          aria-valuemin={0}
          aria-valuemax={MAX_SATIETY}
          aria-valuenow={pet.satiety}
        >
          <div className={styles.satietyFill} style={fillStyle} />
        </div>
        <div className={styles.satietyCaption}>
          Satiety {pet.satiety} / {MAX_SATIETY}
        </div>

        <motion.button
          type="button"
          className={`btn ${styles.feedButton}`}
          onClick={() => pet.feed()}
          disabled={!pet.canFeed}
          whileTap={pet.canFeed ? { scale: 0.96 } : undefined}
          aria-label="Feed your companion"
        >
          {pet.canFeed
            ? `Feed ${character.name}`
            : pet.satiety >= MAX_SATIETY
              ? "Full for today"
              : "Complete a habit to earn food"}
        </motion.button>
      </section>

      <section className={`card card-pad ${styles.statsCard}`}>
        <div className="eyebrow">Today</div>
        <ul className={styles.statList}>
          <li className={styles.statRow}>
            <span>Habits completed</span>
            <strong>{pet.completedToday}</strong>
          </li>
          <li className={styles.statRow}>
            <span>Food available</span>
            <strong>{pet.availableFood}</strong>
          </li>
          <li className={styles.statRow}>
            <span>Fed today</span>
            <strong>{pet.feedsToday}</strong>
          </li>
          <li className={styles.statRow}>
            <span>Lifetime feeds</span>
            <strong>{pet.totalFeeds}</strong>
          </li>
        </ul>
        <p className={styles.statsHint}>
          Each habit you complete today earns one piece of food. Come back tomorrow —
          your companion will be hungry again.
        </p>
      </section>
    </div>
  );
}
