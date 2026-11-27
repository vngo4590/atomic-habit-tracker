"use client";

import { useId } from "react";

import { Button, Input } from "@/components/ui";

import { EMOJI_GRID } from "./moods";
import styles from "./MoodPicker.module.css";

interface CustomMoodPanelProps {
  emoji: string;
  label: string;
  onEmojiChange: (emoji: string) => void;
  onLabelChange: (label: string) => void;
  onApply: () => void;
}

/**
 * CustomMoodPanel — the disclosed two-step builder: (1) pick or type an
 * emoji, (2) name the mood. Either part alone is enough, so "Use" enables as
 * soon as one is present.
 */
export function CustomMoodPanel({ emoji, label, onEmojiChange, onLabelChange, onApply }: CustomMoodPanelProps) {
  const nameId = useId();
  const canApply = Boolean(emoji || label.trim());

  return (
    <div className={styles.panel}>
      <p className={styles.step}>1. Pick an emoji (or type your own)</p>
      <div className={styles.emojiGrid} role="group" aria-label="Emoji">
        {EMOJI_GRID.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={emoji === item}
            className={styles.emojiButton}
            onClick={() => onEmojiChange(emoji === item ? "" : item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className={styles.typeRow}>
        <span className={styles.typeLabel} aria-hidden="true">
          Or type:
        </span>
        <Input
          aria-label="Custom emoji"
          className={styles.typeInput}
          placeholder="✨"
          maxLength={4}
          value={emoji}
          onChange={(event) => onEmojiChange(event.target.value.trim())}
        />
      </div>
      <label className={styles.step} htmlFor={nameId}>
        2. Name your mood
      </label>
      <div className={styles.nameRow}>
        {emoji ? (
          <span className={styles.namePreview} aria-hidden="true">
            {emoji}
          </span>
        ) : null}
        <Input
          id={nameId}
          className={styles.nameInput}
          placeholder="e.g. Energized, Calm, Grateful"
          value={label}
          maxLength={30}
          onChange={(event) => onLabelChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onApply();
            }
          }}
        />
        <Button variant="secondary" size="sm" onClick={onApply} disabled={!canApply}>
          Use
        </Button>
      </div>
    </div>
  );
}
