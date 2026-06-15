"use client";

import { motion } from "framer-motion";

import { PetEcosystem } from "./PetEcosystem";
import styles from "./page.module.css";

/**
 * The Pet tab (`/pet`). Home of the living pet ecosystem: a small Tamagotchi-style
 * world where completing habits earns food, food keeps procedurally-generated
 * companions alive and evolving, and neglect can — permanently — cost a pet. The
 * page itself is a thin shell; all the living logic sits in `PetEcosystem`.
 */
export default function PetPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="page-header">
        <div>
          <div className="eyebrow">Companions</div>
          <h1 className="h1">Pet Ecosystem</h1>
          <p className={styles.subtitle}>
            Feed your companions with the habits you complete. Care for them and
            they evolve; neglect them and they may not make it.
          </p>
        </div>
      </div>

      <PetEcosystem />
    </motion.div>
  );
}
