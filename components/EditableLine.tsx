"use client";

import { useState } from "react";

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

  if (editing) {
    return (
      <div>
        <textarea className="input" rows={2} autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={placeholder} />
        <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
          <button className="btn btn-sm" onClick={() => { setDraft(value); setEditing(false); }}>Cancel</button>
          <button className="btn btn-sm btn-primary" onClick={() => { onSave(draft); setEditing(false); }}>Save</button>
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
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        background: "transparent",
        border: "none",
        padding: "4px 0",
        margin: 0,
        fontFamily: "var(--serif)",
        fontStyle: empty ? "italic" : "normal",
        fontSize: empty ? 14 : 16,
        color: empty ? "var(--ink-3)" : "var(--ink-2)",
        lineHeight: 1.45,
      }}
    >
      {empty ? (
        <>
          <span className="mono" style={{ display: "block", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
            Not set yet
          </span>
          {placeholder}
        </>
      ) : value}
    </button>
  );
}
