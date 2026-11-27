"use client";

import { Minus, Plus } from "lucide-react";
import { useState, type CSSProperties } from "react";

import { Badge, Button, Card, IconButton } from "@/components/ui";

import { formatAge, getTemperament, satietyCapacity, type PetView } from "..";
import { MoodSprite } from "./MoodSprite";
import styles from "./PetCard.module.css";

interface PetCardProps {
  /** The fully-derived, render-ready pet (simulated to now). */
  view: PetView;
  /** Food units available from today's shared pool. */
  availableFood: number;
  /** Feed this pet by `amount` units. */
  onFeed: (amount: number) => void;
  /** Lay this (dead) pet to rest. */
  onBury: () => void;
  /** Release this pet from the ecosystem. */
  onDelete: () => void;
}

/** A labelled 0–100% meter (fullness / health). Fill width passes through as `--fill`. */
function Vital({ label, ratio, tone }: { label: string; ratio: number; tone: "fullness" | "health" }) {
  const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return (
    <div className={styles.vital}>
      <span className={styles.vitalLabel}>{label}</span>
      <div
        className={styles.track}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%`}
      >
        <div className={`${styles.fill} ${styles[tone]}`} style={{ "--fill": ratio } as CSSProperties} />
      </div>
    </div>
  );
}

/** A quiet memorial for a pet that has passed away. */
function MemorialCard({ view, onBury }: Pick<PetCardProps, "view" | "onBury">) {
  return (
    <Card as="article" className={`${styles.card} ${styles.memorial}`}>
      <div className={styles.sprite}>
        <MoodSprite sprite={view.sprite} label={`${view.name}, who has passed away`} animation="none" />
      </div>
      <h3 className={styles.name}>{view.name}</h3>
      <p className={styles.meta}>
        Passed away · reached {view.stageLabel}
        <br />
        Lived {formatAge(view.ageMs)} · {view.totalFeeds} lifetime feeds
      </p>
      <Button variant="ghost" size="sm" onClick={onBury}>
        Lay to rest
      </Button>
    </Card>
  );
}

/** Why feeding is unavailable right now, or null when the pet can be fed. */
function feedBlocker(capacity: number, availableFood: number): string | null {
  if (capacity <= 0) return "Full for now — come back later.";
  if (availableFood <= 0) return "Complete a habit to earn food.";
  return null;
}

/**
 * PetCard renders one companion: its animated mood sprite, fullness and health
 * meters, an evolution hint and a feed stepper bounded by today's food and the
 * pet's appetite. A pet that has died renders as a memorial instead.
 */
export function PetCard({ view, availableFood, onFeed, onBury, onDelete }: PetCardProps) {
  const [amount, setAmount] = useState(1);

  if (!view.vitals.isAlive) {
    return <MemorialCard view={view} onBury={onBury} />;
  }

  const temperament = getTemperament(view.genome.temperament);
  const capacity = satietyCapacity(view.vitals.satiety);
  // The most we can feed right now: bounded by both food and the pet's appetite.
  const maxFeed = Math.max(0, Math.min(availableFood, capacity));
  const feedAmount = Math.min(Math.max(1, amount), Math.max(1, maxFeed));
  const blocker = feedBlocker(capacity, availableFood);
  const hintId = `pet-${view.id}-feed-hint`;

  // Releasing a living companion can't be undone, so ask first.
  const confirmRelease = () => {
    if (window.confirm(`Release ${view.name}? This can't be undone.`)) onDelete();
  };

  return (
    <Card as="article" className={styles.card}>
      <header className={styles.header}>
        <div>
          <h3 className={styles.name}>{view.name}</h3>
          <p className={styles.meta}>
            {temperament.name} · {formatAge(view.ageMs)}
          </p>
        </div>
        <Badge tone="primary">{view.stageLabel}</Badge>
      </header>

      <div className={styles.sprite}>
        <MoodSprite
          sprite={view.sprite}
          label={`${view.name}, feeling ${view.mood.label.toLowerCase()}`}
          animation={view.mood.animation}
          showHearts={view.mood.id === "inLove"}
          pixelSize={14}
        />
      </div>

      <p className={styles.mood}>
        <span aria-hidden="true">{view.mood.face}</span> {view.mood.label}
      </p>

      <div className={styles.vitals}>
        <Vital label="Fullness" ratio={view.satietyRatio} tone="fullness" />
        <Vital label="Health" ratio={view.healthRatio} tone="health" />
      </div>

      <p className={styles.meta}>
        {view.totalFeeds} {view.totalFeeds === 1 ? "feed" : "feeds"} fed ·{" "}
        {view.feedsUntilNextStage === null
          ? "fully grown"
          : `${view.feedsUntilNextStage} more to evolve`}
      </p>

      <div className={styles.feedRow}>
        <div className={styles.stepper} role="group" aria-label={`Food to give ${view.name}`}>
          <IconButton
            icon={<Minus />}
            aria-label="Feed fewer"
            variant="secondary"
            onClick={() => setAmount(Math.max(1, feedAmount - 1))}
            disabled={feedAmount <= 1}
          />
          <output className={styles.stepperValue} aria-live="polite">
            {feedAmount}
          </output>
          <IconButton
            icon={<Plus />}
            aria-label="Feed more"
            variant="secondary"
            onClick={() => setAmount(Math.min(maxFeed, feedAmount + 1))}
            disabled={feedAmount >= maxFeed}
          />
        </div>
        <Button
          className={styles.feed}
          disabled={maxFeed <= 0}
          aria-describedby={blocker ? hintId : undefined}
          onClick={() => onFeed(feedAmount)}
        >
          Feed
        </Button>
      </div>
      {blocker ? (
        <p id={hintId} className={styles.hint}>
          {blocker}
        </p>
      ) : null}

      <Button variant="ghost" size="sm" className={styles.release} onClick={confirmRelease}>
        Release
      </Button>
    </Card>
  );
}
