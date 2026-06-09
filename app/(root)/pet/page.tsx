"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { clientLogger } from "@/lib/logger-client";
import { usePet } from "@/lib/hooks/usePet";
import type { PetCharacterId } from "@/lib/pet";

import { CharacterPicker } from "./CharacterPicker";
import { PetStage } from "./PetStage";
import styles from "./page.module.css";

/**
 * Pet tab — a small Tamagotchi-style companion. New visitors adopt a pixel
 * creature; returning visitors see their pet and feed it. Feeding is fuelled by
 * completing habits, so the game gently reinforces the core habit loop. State is
 * mirrored in localStorage via {@link usePet}; the "food" is always derived from
 * real habit completions in the store.
 */
export default function PetPage() {
  const pet = usePet();
  // When true we show the picker even if a pet is already adopted, so people can
  // switch companions on demand via the stage's "Change" button.
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "pet" });
  }, []);

  const handleChoose = (id: PetCharacterId) => {
    pet.choose(id);
    setPicking(false);
  };

  const showPicker = pet.ready && (!pet.hasChosen || picking);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="page-header">
        <div>
          <div className="eyebrow">Become</div>
          <h1 className="h1">
            Pet <em>Companion</em>
          </h1>
        </div>
      </div>

      {!pet.ready ? (
        <div className={`card card-pad ${styles.loading}`}>Waking your companion…</div>
      ) : showPicker ? (
        <CharacterPicker onChoose={handleChoose} />
      ) : (
        <PetStage pet={pet} onChangeCompanion={() => setPicking(true)} />
      )}
    </motion.div>
  );
}
