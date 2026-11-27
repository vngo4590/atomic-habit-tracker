"use client";

import { useId, useRef, useState, type Ref } from "react";

import { Button, Field, Input, TextArea } from "@/components/ui";
import { clientLogger } from "@/lib/logger-client";

import { DEFAULT_MOOD, isPresetMood } from "./moods";
import { MoodPicker } from "./MoodPicker";
import styles from "./JournalComposer.module.css";

/** Optional starters shown as chips under the compose heading. */
export const JOURNAL_PROMPTS = [
  "What habit felt automatic today?",
  "Where did friction show up?",
  "What is one tiny adjustment for tomorrow?",
] as const;

export interface JournalDraft {
  title: string;
  body: string;
  mood: string;
}

interface JournalComposerProps {
  /** "new" = the always-visible compose box; "edit" = inline in an entry. */
  mode: "new" | "edit";
  initial?: JournalDraft;
  /** Receives trimmed values. Only called when the title is non-empty. */
  onSave: (draft: JournalDraft) => void;
  /** Edit mode only — leave the entry unchanged. */
  onCancel?: () => void;
  /** Lets the page focus the title from elsewhere (e.g. the empty state). */
  titleRef?: Ref<HTMLInputElement>;
}

const EMPTY_DRAFT: JournalDraft = { title: "", body: "", mood: DEFAULT_MOOD };

/**
 * JournalComposer — title, mood and reflection for one entry. The same form
 * powers the compose box at the top of the journal and inline editing of an
 * existing entry, so both flows behave identically.
 */
export function JournalComposer({ mode, initial = EMPTY_DRAFT, onSave, onCancel, titleRef }: JournalComposerProps) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [mood, setMood] = useState(initial.mood || DEFAULT_MOOD);
  // Bumped to remount the mood picker (closing its panel) after a reset.
  const [pickerKey, setPickerKey] = useState(0);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const headingId = useId();
  const isNew = mode === "new";
  const dirty = Boolean(title || body) || mood !== (initial.mood || DEFAULT_MOOD);

  const reset = () => {
    setTitle("");
    setBody("");
    setMood(DEFAULT_MOOD);
    setPickerKey((key) => key + 1);
  };

  const save = () => {
    clientLogger.info("Journal entry submission attempted", {
      page: "journal",
      mode: isNew ? "create" : "edit",
      hasTitle: Boolean(title.trim()),
      hasBody: Boolean(body.trim()),
      moodType: isPresetMood(mood) ? "preset" : "custom",
    });
    if (!title.trim()) return;
    onSave({ title: title.trim(), body: body.trim(), mood });
    if (isNew) reset();
  };

  const applyPrompt = (prompt: string) => {
    setTitle(prompt);
    bodyRef.current?.focus();
  };

  return (
    <section
      className={styles.composer}
      aria-labelledby={isNew ? headingId : undefined}
      aria-label={isNew ? undefined : "Edit entry"}
    >
      {isNew ? (
        <>
          <h2 id={headingId} className={styles.heading}>
            How did today go?
          </h2>
          <div className={styles.prompts} role="group" aria-label="Writing prompts">
            {JOURNAL_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" className={styles.prompt} onClick={() => applyPrompt(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
        </>
      ) : null}
      <Field label="Title">
        <Input
          ref={titleRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What happened today?"
        />
      </Field>
      <MoodPicker key={pickerKey} value={mood} onChange={setMood} />
      <Field label="Reflection" hint="Markdown works: **bold**, lists, links.">
        <TextArea
          ref={bodyRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={isNew ? 5 : 6}
          placeholder="Capture the lesson while it is fresh."
        />
      </Field>
      <div className={styles.actions}>
        {isNew ? (
          dirty ? (
            <Button variant="ghost" onClick={reset}>
              Clear
            </Button>
          ) : null
        ) : (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button disabled={!title.trim()} onClick={save}>
          {isNew ? "Save entry" : "Save changes"}
        </Button>
      </div>
    </section>
  );
}
