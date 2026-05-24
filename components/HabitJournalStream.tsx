"use client";

import { useState } from "react";

import { ExpandableText } from "@/components/ExpandableText";
import { IconTrash } from "@/components/Icons";
import { MarkdownText } from "@/components/MarkdownText";
import { fmt } from "@/lib/helpers";
import type { CheckIn, Habit } from "@/lib/types";

import styles from "./HabitJournalStream.module.css";

/** Mood metadata — value → emoji face + label + colour. Index = value-1. */
const MOODS = [
  { value: 1, face: "😢", label: "Awful", color: "oklch(60% 0.12 30)" },
  { value: 2, face: "😕", label: "Meh", color: "oklch(65% 0.10 60)" },
  { value: 3, face: "😐", label: "Okay", color: "oklch(70% 0.04 90)" },
  { value: 4, face: "🙂", label: "Good", color: "oklch(70% 0.10 145)" },
  { value: 5, face: "😄", label: "Great", color: "oklch(68% 0.13 145)" },
];

/** Extract the structured CheckIn payload, treating legacy booleans as
    "no structured data". */
function checkIn(value: Habit["history"][string]): CheckIn | null {
  return typeof value === "object" && value !== null ? value : null;
}

/**
 * HabitJournalStream — chronological list of all journal/mood entries
 * for one habit. Used on the habit detail page. Empty state nudges the
 * user toward inline check-in capture.
 */
export function HabitJournalStream({
  habit,
  onSaveEntry,
  onClearEntry,
}: {
  habit: Habit;
  onSaveEntry: (dateKey: string, payload: Partial<CheckIn>) => void;
  onClearEntry: (dateKey: string) => void;
}) {
  // Filter to entries with either a journal note or a rated mood, newest
  // first. Untouched check-ins (just a boolean) are excluded.
  const entries = Object.entries(habit.history)
    .map(([date, value]) => ({ date, entry: checkIn(value) }))
    .filter((item): item is { date: string; entry: CheckIn } =>
      Boolean(item.entry?.journal || item.entry?.mood),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  if (entries.length === 0) {
    return (
      <div className={`card card-pad ${styles.emptyCard}`}>
        <div className={styles.emptyTitle}>No journal entries for this habit yet.</div>
        <div className={`muted ${styles.emptyBody}`}>
          When you check it done, you can capture a mood and quick note. Those entries will live here.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stream}>
      {entries.map(({ date, entry }) => (
        <HabitJournalCard
          key={date}
          date={date}
          entry={entry}
          onSave={(payload) => onSaveEntry(date, payload)}
          onClear={() => onClearEntry(date)}
        />
      ))}
    </div>
  );
}

/**
 * HabitJournalCard — one entry in the stream. Toggles between display
 * and inline edit modes. The mood colour is passed in as a CSS variable
 * (--mood-color) so the module CSS can theme the active state generically.
 */
function HabitJournalCard({
  date,
  entry,
  onSave,
  onClear,
}: {
  date: string;
  entry: CheckIn;
  onSave: (payload: Partial<CheckIn>) => void;
  onClear: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [mood, setMood] = useState(entry.mood ?? 3);
  const [journal, setJournal] = useState(entry.journal ?? "");
  const moodMeta = entry.mood ? MOODS[entry.mood - 1] : null;

  if (editing) {
    return (
      <div className="card card-pad">
        <div className={`muted mono ${styles.dateLabel}`}>{fmt.short(date)}</div>
        <div className={styles.editMoodRow}>
          {MOODS.map((item) => {
            const active = mood === item.value;
            return (
              <button
                key={item.value}
                className={`chip ${active ? styles.editMoodChipActive : styles.editMoodChipInactive}`}
                // CSS variable token passthrough so the active class can
                // colour-mix against this specific mood.
                style={active ? ({ "--mood-color": item.color } as React.CSSProperties) : undefined}
                onClick={() => setMood(item.value)}
              >
                <span>{item.face}</span>
                {item.label}
              </button>
            );
          })}
        </div>
        <textarea
          className="input"
          rows={4}
          value={journal}
          onChange={(event) => setJournal(event.target.value)}
          placeholder="Add a note for this check-in."
        />
        <div className={styles.editActions}>
          <button
            className="btn btn-sm"
            onClick={() => {
              setMood(entry.mood ?? 3);
              setJournal(entry.journal ?? "");
              setEditing(false);
            }}
          >
            Cancel
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              onSave({ mood, journal: journal.trim() || undefined });
              setEditing(false);
            }}
          >
            Save entry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="card card-pad"
      // moodMeta.color is data, not style. We pass it through as a CSS
      // variable so the card border picks it up via the module class.
      style={
        moodMeta
          ? ({
              "--mood-color": moodMeta.color,
              borderColor: "var(--mood-color)",
            } as React.CSSProperties)
          : undefined
      }
    >
      <div className={`${styles.cardHeader} ${entry.journal ? styles.cardHeaderSpaced : ""}`}>
        <div>
          <div className={`muted mono ${styles.dateLabel}`}>{fmt.short(date)}</div>
          {moodMeta && (
            <div className={styles.moodLine}>
              <span className={styles.moodFace}>{moodMeta.face}</span>
              {moodMeta.label}
            </div>
          )}
        </div>
        <div className={styles.cardActions}>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setMood(entry.mood ?? 3);
              setJournal(entry.journal ?? "");
              setEditing(true);
            }}
          >
            Edit
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={onClear}
            aria-label={`Clear journal entry for ${fmt.short(date)}`}
          >
            <IconTrash className={styles.iconTiny} />
          </button>
        </div>
      </div>
      {entry.journal && (
        /* Long check-in notes get a Read more / Read less toggle so the
           habit's journal stream stays scannable when entries get wordy. */
        <ExpandableText
          source={entry.journal}
          previewLines={4}
          collapsedThreshold={200}
        >
          <MarkdownText className={styles.journalBody}>{entry.journal}</MarkdownText>
        </ExpandableText>
      )}
    </div>
  );
}
