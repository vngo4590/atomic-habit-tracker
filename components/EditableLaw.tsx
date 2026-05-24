"use client";

import { useState } from "react";

import styles from "./Editable.module.css";

/**
 * EditableLaw — labelled "click-to-edit" text used for the four habit
 * laws (cue, craving, response, reward). Identical interaction model to
 * EditableLine but adds a header row with a label + uppercase hint, and
 * a bottom rule between laws (omitted on the last row via `last`).
 */
export function EditableLaw({
  label,
  hint,
  value,
  placeholder,
  onSave,
  last,
}: {
  label: string;
  hint: string;
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
  last?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const empty = !value.trim();

  return (
    <div className={last ? styles.lawRowLast : styles.lawRow}>
      <div className={styles.lawHeader}>
        <div className={`h3 ${styles.lawLabel}`}>{label}</div>
        <div className={`muted mono ${styles.lawHint}`}>{hint}</div>
      </div>
      {editing ? (
        <div>
          <textarea
            className="input"
            rows={2}
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
          />
          <div className={styles.editorActions}>
            <button
              className="btn btn-sm"
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                onSave(draft);
                setEditing(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          className={`${styles.display} ${empty ? styles.displayLawEmpty : styles.displayLawFilled}`}
        >
          {empty ? (
            <>
              <span className={`mono ${styles.notSetCaption}`}>Not set yet</span>
              {placeholder}
            </>
          ) : (
            value
          )}
        </button>
      )}
    </div>
  );
}
