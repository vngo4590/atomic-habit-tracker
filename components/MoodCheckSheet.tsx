"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

import { IconClose } from "@/components/Icons";
import { overlayCardVariants, overlayVariants } from "@/lib/animations";
import { fmt } from "@/lib/helpers";
import { clientLogger } from "@/lib/logger-client";
import type { CheckIn, Habit } from "@/lib/types";

import styles from "./MoodCheckSheet.module.css";

/** Mood metadata — value → emoji + label + colour. Index = value-1. */
const MOODS = [
  { value: 1, face: "😢", label: "Awful", color: "oklch(60% 0.12 30)" },
  { value: 2, face: "😕", label: "Meh", color: "oklch(65% 0.10 60)" },
  { value: 3, face: "😐", label: "Okay", color: "oklch(70% 0.04 90)" },
  { value: 4, face: "🙂", label: "Good", color: "oklch(70% 0.10 145)" },
  { value: 5, face: "😄", label: "Great", color: "oklch(68% 0.13 145)" },
];

/** Safe extraction of a structured check-in payload. */
function checkIn(value: Habit["history"][string]): CheckIn | null {
  return typeof value === "object" && value !== null ? value : null;
}

/**
 * MoodCheckSheet — slide-up sheet shown when a user marks a habit done.
 * Lets them rate mood (1–5) and add an optional journal note. Both
 * fields are optional; "Skip" closes without saving structured data.
 */
export function MoodCheckSheet({
  habit,
  dateKey,
  onClose,
  onSave,
}: {
  habit: Habit;
  dateKey: string;
  onClose: () => void;
  onSave: (payload: Partial<CheckIn>) => void;
}) {
  const existing = checkIn(habit.history[dateKey]);
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  const [journal, setJournal] = useState(existing?.journal ?? "");

  // Keep check-in diagnostics safe by logging only the selected mood metadata.
  const handleMoodSelect = (value: number, label: string) => {
    clientLogger.info("Mood selected", {
      event: "mood-check.select",
      habitId: habit.id,
      dateKey,
      mood: label,
      moodValue: value,
    });
    setMood(value);
  };

  const handleSave = () => {
    const payload = {
      ...(mood ? { mood } : {}),
      ...(journal.trim() ? { journal: journal.trim() } : {}),
    };

    clientLogger.info("Mood check-in submitted", {
      event: "mood-check.submit",
      habitId: habit.id,
      dateKey,
      hasMood: Boolean(payload.mood),
      hasJournal: Boolean(payload.journal),
    });
    onSave(payload);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="overlay"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          className={`overlay-card ${styles.card}`}
          onClick={(event) => event.stopPropagation()}
          variants={overlayCardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.button
            className={`btn btn-ghost btn-sm ${styles.closeBtn}`}
            onClick={onClose}
            aria-label="Close"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <IconClose className={styles.closeIcon} />
          </motion.button>

          <div className={styles.headerRow}>
            <div>
              <div className="eyebrow">Check-in · {fmt.short(dateKey)}</div>
              <h1 className={`h1 ${styles.title}`}>
                How did <em>{habit.name.toLowerCase()}</em> feel?
              </h1>
              <p className={styles.intro}>
                Optional, but tracking how habits make you feel reveals which ones are working.
              </p>
            </div>
          </div>

          <div className={styles.moodRow}>
            {MOODS.map((item) => {
              const active = mood === item.value;
              return (
                <motion.button
                  key={item.value}
                  onClick={() => handleMoodSelect(item.value, item.label)}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  animate={
                    active
                      ? {
                          y: -2,
                          boxShadow: "0 8px 20px -6px color-mix(in oklch, var(--ink) 15%, transparent)",
                        }
                      : { y: 0, boxShadow: "none" }
                  }
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className={`${styles.moodTile} ${active ? styles.moodTileActive : ""}`}
                  // Pass the mood colour through as a CSS variable so the
                  // module class can theme border + tint generically.
                  style={{ ["--mood-color" as string]: item.color }}
                >
                  <motion.span
                    className={`${styles.moodFace} ${active ? "" : styles.moodFaceInactive}`}
                    animate={active ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {item.face}
                  </motion.span>
                  <span
                    className={`mono ${styles.moodLabel} ${active ? styles.moodLabelActive : ""}`}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className={styles.journalSection}>
            <label className="field-label" htmlFor="mood-journal">
              Journal note
            </label>
            <textarea
              id="mood-journal"
              className="input"
              value={journal}
              onChange={(event) => setJournal(event.target.value)}
              placeholder={
                mood && mood <= 2
                  ? "What got in the way? Be honest."
                  : mood && mood >= 4
                    ? "What made today work? Capture it."
                    : "How was it? Anything to remember?"
              }
            />
          </div>

          <div className={styles.actions}>
            <motion.button className="btn btn-ghost" onClick={onClose} whileTap={{ scale: 0.97 }}>
              Skip - just mark it done
            </motion.button>
            <motion.button
              className="btn btn-primary"
              onClick={handleSave}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              Save check-in
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
