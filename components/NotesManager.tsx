"use client";

import { useState } from "react";

import { IconCheck, IconEdit, IconTrash } from "@/components/Icons";
import { fmt, todayKey } from "@/lib/helpers";
import type { Habit } from "@/lib/types";

import styles from "./NotesManager.module.css";

/**
 * NotesManager — standalone notes attached to a habit (independent of
 * day-by-day journal entries). Supports add, inline-edit, single-delete,
 * and a bulk select/delete mode.
 */
export function NotesManager({
  habit,
  onUpdateNotes,
}: {
  habit: Habit;
  onUpdateNotes: (notes: Habit["notes"]) => void;
}) {
  // Composer + bulk + inline-edit state. We keep three small state slots
  // rather than a single reducer because the transitions between them
  // are direct (each interaction owns its own state).
  const [draft, setDraft] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const addNote = () => {
    if (!draft.trim()) return;
    onUpdateNotes([
      { id: `pending-${Date.now()}`, createdAt: todayKey(), body: draft.trim() },
      ...habit.notes,
    ]);
    setDraft("");
  };
  const deleteOne = (id: string) => onUpdateNotes(habit.notes.filter((note) => note.id !== id));
  const beginEdit = (note: Habit["notes"][number]) => {
    setEditingId(note.id);
    setEditDraft(note.body);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };
  const saveEdit = (id: string) => {
    const body = editDraft.trim();
    if (!body) return;
    onUpdateNotes(habit.notes.map((note) => (note.id === id ? { ...note, body } : note)));
    cancelEdit();
  };
  const deleteSelected = () => {
    onUpdateNotes(habit.notes.filter((note) => !selected.has(note.id)));
    setSelected(new Set());
    setBulkMode(false);
  };
  const toggleSelected = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div>
      <div className={`card card-pad ${styles.composer}`}>
        <textarea
          className="input"
          rows={2}
          placeholder="Add a note for this habit..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              addNote();
            }
          }}
        />
        <div className={styles.composerRow}>
          <span className={`muted mono ${styles.composerHint}`}>CTRL + ENTER TO SAVE</span>
          <button className="btn btn-sm btn-primary" onClick={addNote} disabled={!draft.trim()}>
            Add note
          </button>
        </div>
      </div>

      {habit.notes.length > 0 && (
        <div className={styles.headerBar}>
          <div className={`muted mono ${styles.headerCount}`}>
            {bulkMode && selected.size > 0
              ? `${selected.size} OF ${habit.notes.length} SELECTED`
              : `${habit.notes.length} NOTES`}
          </div>
          {bulkMode ? (
            <div className={styles.headerActions}>
              <button
                className="btn btn-sm"
                onClick={() => setSelected(new Set(habit.notes.map((note) => note.id)))}
              >
                Select all
              </button>
              <button className="btn btn-sm" onClick={deleteSelected} disabled={selected.size === 0}>
                <IconTrash className={styles.iconTiny} /> Delete
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setBulkMode(false);
                  setSelected(new Set());
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <button className="btn btn-sm btn-ghost" onClick={() => setBulkMode(true)}>
              Select
            </button>
          )}
        </div>
      )}

      {habit.notes.length === 0 ? (
        <div className={`card card-pad ${styles.empty}`}>
          No standalone notes yet. Add one above, or capture them inline when you check in.
        </div>
      ) : (
        <div className={styles.list}>
          {habit.notes.map((note) => {
            const isSelected = selected.has(note.id);
            return (
              <div
                key={note.id}
                className={`card card-pad ${styles.noteCard} ${
                  bulkMode ? styles.noteCardSelectable : ""
                } ${isSelected ? styles.noteCardSelected : ""}`}
                onClick={() => bulkMode && toggleSelected(note.id)}
              >
                {bulkMode && (
                  <div
                    className={`${styles.checkbox} ${
                      isSelected ? styles.checkboxChecked : styles.checkboxUnchecked
                    }`}
                  >
                    {isSelected && <IconCheck className={styles.iconTiny} />}
                  </div>
                )}
                <div className={styles.noteBody}>
                  <div className={`muted mono ${styles.noteDate}`}>{fmt.short(note.createdAt)}</div>
                  {editingId === note.id ? (
                    <div>
                      <textarea
                        className="input"
                        aria-label="Edit note body"
                        rows={3}
                        autoFocus
                        value={editDraft}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => setEditDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") cancelEdit();
                          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                            saveEdit(note.id);
                          }
                        }}
                      />
                      <div className={styles.editActions}>
                        <button
                          className="btn btn-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            cancelEdit();
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={!editDraft.trim()}
                          onClick={(event) => {
                            event.stopPropagation();
                            saveEdit(note.id);
                          }}
                        >
                          Save note
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={styles.noteText}>{note.body}</p>
                  )}
                </div>
                {!bulkMode && (
                  <div className={styles.noteActions}>
                    {editingId !== note.id && (
                      <button
                        className="btn btn-sm btn-ghost"
                        aria-label="Edit note"
                        onClick={(event) => {
                          event.stopPropagation();
                          beginEdit(note);
                        }}
                      >
                        <IconEdit className={styles.iconTiny} />
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-ghost"
                      aria-label="Delete note"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteOne(note.id);
                      }}
                    >
                      <IconTrash className={styles.iconTiny} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
