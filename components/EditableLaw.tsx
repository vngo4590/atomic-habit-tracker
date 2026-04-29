"use client";

import { useState } from "react";

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
    <div style={{ padding: "14px 0", borderBottom: last ? "none" : "1px solid var(--rule)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div className="h3" style={{ fontSize: 11.5 }}>{label}</div>
        <div className="muted mono" style={{ fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase" }}>{hint}</div>
      </div>
      {editing ? (
        <div>
          <textarea className="input" rows={2} autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={placeholder} />
          <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
            <button className="btn btn-sm" onClick={() => { setDraft(value); setEditing(false); }}>Cancel</button>
            <button className="btn btn-sm btn-primary" onClick={() => { onSave(draft); setEditing(false); }}>Save</button>
          </div>
        </div>
      ) : (
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
            fontSize: empty ? 13.5 : 14.5,
            color: empty ? "var(--ink-3)" : "var(--ink-2)",
            lineHeight: 1.5,
            fontFamily: "var(--serif)",
            fontStyle: empty ? "italic" : "normal",
          }}
        >
          {value || placeholder}
        </button>
      )}
    </div>
  );
}
