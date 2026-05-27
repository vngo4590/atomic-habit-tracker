"use client";

import { useState } from "react";

import { clientLogger } from "@/lib/logger-client";

import styles from "./Editable.module.css";

/**
 * EditableLine — single-line "click-to-edit" text used for short habit
 * fields (e.g. identity statement). Renders a serif display button until
 * clicked, then swaps to a textarea with Cancel/Save actions. The parent
 * receives the new value through `onSave` only when the user confirms.
 */
export function EditableLine({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const empty = !value.trim();

  const handleSave = () => {
    clientLogger.info("Inline text saved", {
      event: "editable-line.save",
      hadValue: Boolean(value.trim()),
      hasValue: Boolean(draft.trim()),
    });
    onSave(draft);
    setEditing(false);
  };

  if (editing) {
    return (
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
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={`${styles.display} ${empty ? styles.displayLineEmpty : styles.displayLineFilled}`}
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
  );
}
