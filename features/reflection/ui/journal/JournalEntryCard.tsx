"use client";

import { Pencil } from "lucide-react";

import { ExpandableText } from "@/components/ExpandableText";
import { Button } from "@/components/ui";
import { fmt } from "@/lib/helpers";
import type { JournalEntry } from "@/lib/types";

import { LazyMarkdown } from "../LazyMarkdown";
import { JournalComposer, type JournalDraft } from "./JournalComposer";
import { moodFor } from "./moods";
import tones from "./moods.module.css";
import styles from "./JournalEntryCard.module.css";

interface JournalEntryCardProps {
  entry: JournalEntry;
  editing: boolean;
  onEdit: () => void;
  onSave: (draft: JournalDraft) => void;
  onCancel: () => void;
}

/**
 * JournalEntryCard — one entry in the reading list. A thin mood-coloured rule
 * on the left plus a text mood badge (never colour alone). "Edit" swaps the
 * card's content for the composer in place, so editing keeps your position.
 */
export function JournalEntryCard({ entry, editing, onEdit, onSave, onCancel }: JournalEntryCardProps) {
  const mood = moodFor(entry.mood);

  return (
    <article className={`${tones.tone} ${styles.card}`} data-mood={mood.tone}>
      {editing ? (
        <JournalComposer
          mode="edit"
          initial={{ title: entry.title, body: entry.body, mood: entry.mood || "meh" }}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : (
        <>
          <header className={styles.header}>
            <div className={styles.meta}>
              <time className={styles.date} dateTime={entry.date}>
                {fmt.long(entry.date)}
              </time>
              <span className={styles.mood}>
                {mood.face ? <span aria-hidden="true">{mood.face}</span> : null}
                {mood.label}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<Pencil size={16} strokeWidth={1.75} />}
              onClick={onEdit}
              aria-label={`Edit ${entry.title}`}
            >
              Edit
            </Button>
          </header>
          {/* Long sentence-style titles clamp to two lines with a toggle. */}
          <ExpandableText source={entry.title} previewLines={2} collapsedThreshold={80}>
            <h3 className={styles.title}>{entry.title}</h3>
          </ExpandableText>
          {entry.body ? (
            <div className={styles.body}>
              <ExpandableText source={entry.body} previewLines={5} collapsedThreshold={240}>
                <LazyMarkdown>{entry.body}</LazyMarkdown>
              </ExpandableText>
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}
