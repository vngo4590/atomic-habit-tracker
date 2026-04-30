"use client";

import { useState } from "react";

import { IconCheck, IconTrash } from "@/components/Icons";
import { fmt, todayKey } from "@/lib/helpers";
import type { Habit } from "@/lib/types";

export function NotesManager({
  habit,
  onUpdateNotes,
}: {
  habit: Habit;
  onUpdateNotes: (notes: Habit["notes"]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const addNote = () => {
    if (!draft.trim()) {
      return;
    }
    onUpdateNotes([{ id: `pending-${Date.now()}`, createdAt: todayKey(), body: draft.trim() }, ...habit.notes]);
    setDraft("");
  };
  const deleteOne = (id: string) => onUpdateNotes(habit.notes.filter((note) => note.id !== id));
  const deleteSelected = () => {
    onUpdateNotes(habit.notes.filter((note) => !selected.has(note.id)));
    setSelected(new Set());
    setBulkMode(false);
  };
  const toggleSelected = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  return (
    <div>
      <div className="card card-pad" style={{ marginBottom: 16 }}>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <span className="muted mono" style={{ fontSize: 10, letterSpacing: "0.06em" }}>CTRL + ENTER TO SAVE</span>
          <button className="btn btn-sm btn-primary" onClick={addNote} disabled={!draft.trim()}>Add note</button>
        </div>
      </div>

      {habit.notes.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 4px" }}>
          <div className="muted mono" style={{ fontSize: 11, letterSpacing: "0.06em" }}>
            {bulkMode && selected.size > 0 ? `${selected.size} OF ${habit.notes.length} SELECTED` : `${habit.notes.length} NOTES`}
          </div>
          {bulkMode ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-sm" onClick={() => setSelected(new Set(habit.notes.map((note) => note.id)))}>Select all</button>
              <button className="btn btn-sm" onClick={deleteSelected} disabled={selected.size === 0}>
                <IconTrash style={{ width: 12, height: 12 }} /> Delete
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => { setBulkMode(false); setSelected(new Set()); }}>Done</button>
            </div>
          ) : (
            <button className="btn btn-sm btn-ghost" onClick={() => setBulkMode(true)}>Select</button>
          )}
        </div>
      )}

      {habit.notes.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: "center", color: "var(--ink-3)", fontStyle: "italic", fontFamily: "var(--serif)", fontSize: 16, padding: "40px 20px" }}>
          No standalone notes yet. Add one above, or capture them inline when you check in.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {habit.notes.map((note) => {
            const isSelected = selected.has(note.id);
            return (
              <div
                key={note.id}
                className="card card-pad"
                onClick={() => bulkMode && toggleSelected(note.id)}
                style={{
                  cursor: bulkMode ? "pointer" : "default",
                  background: isSelected ? "var(--accent-soft)" : "var(--bg-elev)",
                  borderColor: isSelected ? "var(--accent)" : "var(--rule)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                }}
              >
                {bulkMode && (
                  <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2, border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--rule-strong)"}`, background: isSelected ? "var(--accent)" : "transparent", display: "grid", placeItems: "center", color: "var(--bg)" }}>
                    {isSelected && <IconCheck style={{ width: 12, height: 12 }} />}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="muted mono" style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                    {fmt.short(note.createdAt)}
                  </div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{note.body}</p>
                </div>
                {!bulkMode && (
                  <button className="btn btn-sm btn-ghost" onClick={(event) => { event.stopPropagation(); deleteOne(note.id); }}>
                    <IconTrash style={{ width: 12, height: 12 }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
