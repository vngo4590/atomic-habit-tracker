"use client";

import { useMemo, useState } from "react";

import { PixelSprite } from "@/components/pet/PixelSprite";
import {
  generateSprite,
  getTemperament,
  randomSeed,
  TEMPERAMENTS,
  type TemperamentId,
} from "@/lib/pet";

import styles from "./page.module.css";

/**
 * AdoptPanel lets the user bring a new companion into their ecosystem. They pick
 * a temperament (which biases the creature's colours and behaviour) and a name;
 * a live, shuffleable preview hints at the kind of creature they might get. The
 * real pet's exact look is a server-seeded surprise, so the preview is playful
 * rather than a promise.
 */
export function AdoptPanel({
  onAdopt,
  remainingSlots,
}: {
  /** Called with the chosen name + temperament to adopt a pet. */
  onAdopt: (draft: { name: string; temperament: TemperamentId }) => void;
  /** How many more pets the user may adopt (drives the helper copy). */
  remainingSlots: number;
}) {
  const [temperament, setTemperament] = useState<TemperamentId>(TEMPERAMENTS[0].id);
  const [name, setName] = useState("");
  // The preview seed is reshuffled to illustrate that every creature is unique.
  const [previewSeed, setPreviewSeed] = useState(() => randomSeed());

  // Regenerate the preview sprite only when the inputs that affect it change.
  // Deliberately drawn at the "egg" stage — the same form every pet actually
  // starts as — so the preview never promises a grown-up creature it won't
  // deliver. Which features (ears, horns, wings, patterns) a pet reveals as it
  // evolves stays a genuine surprise unlocked through daily care.
  const previewSprite = useMemo(
    () => generateSprite({ seed: previewSeed, temperament }, "egg"),
    [previewSeed, temperament],
  );

  const active = getTemperament(temperament);
  const trimmedName = name.trim();

  return (
    <section className={`card ${styles.adoptCard}`}>
      <span className="eyebrow">Adopt a companion</span>
      <p className={styles.adoptLede}>
        Pick a personality and a name. {remainingSlots > 0
          ? `You have room for ${remainingSlots} more ${remainingSlots === 1 ? "pet" : "pets"}.`
          : "Your ecosystem is full."}
      </p>

      <div className={styles.adoptBody}>
        <div className={styles.previewColumn}>
          <div className={styles.previewSprite}>
            <PixelSprite sprite={previewSprite} label={`A ${active.name.toLowerCase()} creature egg preview`} pixelSize={12} />
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setPreviewSeed(randomSeed())}
          >
            Shuffle preview
          </button>
          <p className={styles.previewNote}>Every pet hatches from an egg — how it grows up is a surprise!</p>
        </div>

        <div className={styles.adoptForm}>
          <div className={styles.temperamentGrid}>
            {TEMPERAMENTS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.temperamentChip} ${option.id === temperament ? styles.temperamentChipActive : ""}`}
                onClick={() => setTemperament(option.id)}
                aria-pressed={option.id === temperament}
              >
                {option.name}
              </button>
            ))}
          </div>

          <p className={styles.temperamentBlurb}>{active.blurb}</p>

          <label className={styles.nameLabel} htmlFor="pet-name">
            Name
          </label>
          <input
            id="pet-name"
            className={styles.nameInput}
            type="text"
            value={name}
            maxLength={40}
            placeholder={`e.g. ${active.name === "Calm" ? "Misty" : "Pip"}`}
            onChange={(event) => setName(event.target.value)}
          />

          <button
            type="button"
            className="btn btn-primary"
            disabled={remainingSlots <= 0 || trimmedName.length === 0}
            onClick={() => {
              onAdopt({ name: trimmedName, temperament });
              setName("");
              setPreviewSeed(randomSeed());
            }}
          >
            Adopt {trimmedName ? trimmedName : "companion"}
          </button>
        </div>
      </div>
    </section>
  );
}
