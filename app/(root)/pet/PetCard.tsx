"use client";

import { useState } from "react";

import { MoodSprite } from "@/components/pet/MoodSprite";
import { formatAge, getTemperament, satietyCapacity, type PetView } from "@/lib/pet";

import styles from "./page.module.css";

/**
 * PetCard renders a single companion: its animated mood sprite, satiety and
 * health bars, an evolution hint, and a feed stepper so the user can choose how
 * many food units to give. A pet that has died shows a quiet memorial with the
 * option to lay it to rest. Each card is self-contained so the ecosystem grid
 * stays simple.
 */
export function PetCard({
  view,
  availableFood,
  onFeed,
  onBury,
  onDelete,
}: {
  /** The fully-derived, render-ready pet (simulated to now).*/
  view: PetView;
  /** Food units available from today's shared pool. */
  availableFood: number;
  /** Feed this pet by `amount` units. */
  onFeed: (amount: number) => void;
  /** Lay this (dead) pet to rest. */
  onBury: () => void;
  /** Release this pet (alive or dead) from the ecosystem. */
  onDelete: () => void;
}) {
  const temperament = getTemperament(view.genome.temperament);
  // How many units this pet can still take before it is full.
  const capacity = satietyCapacity(view.vitals.satiety);
  // The most we can feed right now: bounded by both food and the pet's appetite.
  const maxFeed = Math.max(0, Math.min(availableFood, capacity));

  const [amount, setAmount] = useState(1);
  const feedAmount = Math.min(Math.max(1, amount), Math.max(1, maxFeed));

  // Ask before releasing a living companion — it cannot be undone.
  const confirmRelease = () => {
    if (typeof window === "undefined" || window.confirm(`Release ${view.name}? This can't be undone.`)) {
      onDelete();
    }
  };

  // ---- Dead pet: a quiet memorial card -----------------------------------
  if (!view.vitals.isAlive) {
    return (
      <article className={`card ${styles.petCard} ${styles.petCardDead}`}>
        <div className={styles.petSprite}>
          <MoodSprite sprite={view.sprite} label={`${view.name}, who has passed away`} animation="none" />
        </div>
        <h3 className={styles.petName}>{view.name}</h3>
        <p className={styles.petGone}>Passed away · reached {view.stageLabel}</p>
        <p className={styles.petMeta}>
          Lived {formatAge(view.ageMs)} · {view.totalFeeds} lifetime feeds
        </p>
        <button type="button" className="btn btn-ghost" onClick={onBury}>
          Lay to rest
        </button>
      </article>
    );
  }

  // ---- Living pet ---------------------------------------------------------
  return (
    <article className={`card ${styles.petCard}`}>
      <header className={styles.petHeader}>
        <div>
          <h3 className={styles.petName}>{view.name}</h3>
          <span className={styles.petTemperament}>{temperament.name}</span>
        </div>
        <span className={styles.stageBadge}>{view.stageLabel}</span>
      </header>

      {/* Age + lifetime feeds give the user a felt sense of time and care. */}
      <p className={styles.petMeta}>
        {formatAge(view.ageMs)} · {view.totalFeeds} {view.totalFeeds === 1 ? "feed" : "feeds"} fed
      </p>

      <div className={styles.petSprite}>
        <MoodSprite
          sprite={view.sprite}
          label={`${view.name}, feeling ${view.mood.label.toLowerCase()}`}
          animation={view.mood.animation}
          showHearts={view.mood.id === "inLove"}
          pixelSize={14}
        />
      </div>

      <div className={styles.moodRow}>
        <span className={styles.moodFace}>{view.mood.face}</span>
        <span className={styles.moodLabel}>{view.mood.label}</span>
      </div>

      {/* Satiety bar — dynamic width passes through as a CSS variable. */}
      <div className={styles.barRow}>
        <span className={styles.barLabel}>Fullness</span>
        <div className={styles.barTrack}>
          <div className={styles.barFillSatiety} style={{ width: `${Math.round(view.satietyRatio * 100)}%` }} />
        </div>
      </div>

      {/* Health bar — the stakes meter; drains only through neglect. */}
      <div className={styles.barRow}>
        <span className={styles.barLabel}>Health</span>
        <div className={styles.barTrack}>
          <div className={styles.barFillHealth} style={{ width: `${Math.round(view.healthRatio * 100)}%` }} />
        </div>
      </div>

      <p className={styles.evolveHint}>
        {view.feedsUntilNextStage === null
          ? "Fully grown — an elder companion."
          : `${view.feedsUntilNextStage} more ${view.feedsUntilNextStage === 1 ? "feed" : "feeds"} to evolve.`}
      </p>

      <div className={styles.feedRow}>
        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.stepperBtn}
            onClick={() => setAmount((value) => Math.max(1, value - 1))}
            disabled={feedAmount <= 1}
            aria-label="Feed fewer"
          >
            −
          </button>
          <span className={styles.stepperValue}>{feedAmount}</span>
          <button
            type="button"
            className={styles.stepperBtn}
            onClick={() => setAmount((value) => Math.min(maxFeed, value + 1))}
            disabled={feedAmount >= maxFeed}
            aria-label="Feed more"
          >
            +
          </button>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={maxFeed <= 0}
          onClick={() => onFeed(feedAmount)}
        >
          Feed
        </button>
      </div>

      <p className={styles.feedHint}>
        {maxFeed <= 0
          ? capacity <= 0
            ? "Full for now — come back later."
            : "Complete a habit to earn food."
          : `${availableFood} food available · ${view.totalFeeds} lifetime feeds`}
      </p>

      <button type="button" className={styles.releaseBtn} onClick={confirmRelease}>
        Release
      </button>
    </article>
  );
}
