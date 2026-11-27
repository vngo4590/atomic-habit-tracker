"use client";

import { Sparkles } from "lucide-react";
import { useId, useState } from "react";

import { clientLogger } from "@/lib/logger-client";

import { CustomMoodPanel } from "./CustomMoodPanel";
import { PRESET_MOODS, isPresetMood, joinCustomMood, splitCustomMood } from "./moods";
import tones from "./moods.module.css";
import styles from "./MoodPicker.module.css";

interface MoodPickerProps {
  /** Stored mood string (preset key or custom text). */
  value: string;
  onChange: (mood: string) => void;
}

/**
 * MoodPicker — three preset mood chips plus a "Custom" chip that discloses a
 * two-step emoji + name builder. Chips are toggle buttons (aria-pressed) and
 * every mood carries its text label, so colour is never the only signal.
 */
export function MoodPicker({ value, onChange }: MoodPickerProps) {
  const [open, setOpen] = useState(false);
  const [emoji, setEmoji] = useState("");
  const [label, setLabel] = useState("");
  const legendId = useId();
  const customActive = !isPresetMood(value);

  const closePanel = () => {
    setOpen(false);
    setEmoji("");
    setLabel("");
  };

  const selectPreset = (key: string) => {
    clientLogger.info("Journal mood selected", { page: "journal", mood: key });
    onChange(key);
    closePanel();
  };

  const toggleCustom = () => {
    if (!open && customActive) {
      // Reopening an existing custom mood: pre-fill its parts for editing.
      const parts = splitCustomMood(value);
      setEmoji(parts.emoji);
      setLabel(parts.label);
    }
    setOpen((current) => !current);
  };

  const applyCustom = () => {
    const mood = joinCustomMood(emoji, label);
    if (!mood) return;
    clientLogger.info("Journal custom mood selected", {
      page: "journal",
      hasEmoji: Boolean(emoji),
      hasLabel: Boolean(label.trim()),
    });
    onChange(mood);
    closePanel();
  };

  return (
    <div role="group" aria-labelledby={legendId} className={styles.picker}>
      <span id={legendId} className={styles.legend}>
        Mood
      </span>
      <div className={styles.row}>
        {PRESET_MOODS.map((mood) => (
          <button
            key={mood.key}
            type="button"
            data-mood={mood.tone}
            aria-pressed={value === mood.key}
            className={`${tones.tone} ${styles.chip}`}
            onClick={() => selectPreset(mood.key)}
          >
            <span aria-hidden="true">{mood.face}</span>
            {mood.label}
          </button>
        ))}
        <button
          type="button"
          data-mood="custom"
          aria-pressed={customActive || open}
          aria-expanded={open}
          className={`${tones.tone} ${styles.chip}`}
          onClick={toggleCustom}
        >
          {customActive ? value : (
            <>
              <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />
              Custom
            </>
          )}
        </button>
      </div>
      {open ? (
        <CustomMoodPanel
          emoji={emoji}
          label={label}
          onEmojiChange={setEmoji}
          onLabelChange={setLabel}
          onApply={applyCustom}
        />
      ) : null}
    </div>
  );
}
