"use client";

import { motion } from "framer-motion";

import { PixelSprite } from "@/components/pet/PixelSprite";
import { PET_CHARACTERS, type PetCharacterId } from "@/lib/pet";

import styles from "./page.module.css";

/**
 * CharacterPicker is the first thing a new visitor to the Pet tab sees. It shows
 * every adoptable companion as a card with its pixel art, name, personality, and
 * a short blurb, so people can pick the creature whose vibe matches them. Choosing
 * a card calls `onChoose`, which hands the selected id back up to the page.
 */
export function CharacterPicker({ onChoose }: { onChoose: (id: PetCharacterId) => void }) {
  return (
    <section className="card card-pad">
      <div className="eyebrow">Choose your companion</div>
      <p className={styles.pickerLede}>
        Adopt a pixel friend to keep you company. Each one has its own personality —
        feed them by completing your habits.
      </p>
      <div className={styles.pickerGrid}>
        {PET_CHARACTERS.map((character) => (
          <motion.button
            key={character.id}
            type="button"
            className={styles.pickerCard}
            onClick={() => onChoose(character.id)}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            aria-label={`Adopt ${character.name}, a ${character.personality.toLowerCase()} companion`}
          >
            <div className={styles.pickerSprite}>
              <PixelSprite character={character} pixelSize={12} />
            </div>
            <div className={styles.pickerName}>{character.name}</div>
            <div className={styles.pickerPersonality}>{character.personality}</div>
            <p className={styles.pickerBlurb}>{character.blurb}</p>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
