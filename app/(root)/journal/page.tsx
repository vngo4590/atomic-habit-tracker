"use client";

import { useMemo, useState } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { fmt } from "@/lib/helpers";

const PROMPTS = [
  "What habit felt automatic today?",
  "Where did friction show up?",
  "What is one tiny adjustment for tomorrow?",
];
const MOODS = [
  { key: "good", label: "Good day", face: "😄", color: "oklch(68% 0.13 145)" },
  { key: "meh", label: "So-so", face: "😐", color: "oklch(70% 0.04 90)" },
  { key: "hard", label: "Hard", face: "😕", color: "oklch(60% 0.12 30)" },
] as const;
type MoodKey = (typeof MOODS)[number]["key"];

function moodFor(key: string) {
  return MOODS.find((item) => item.key === key) ?? MOODS[1];
}

export default function JournalPage() {
  const { journal, addJournal, updateJournal } = useStoreContext();
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<MoodKey>("good");
  const [entryOverrides, setEntryOverrides] = useState<Record<string, Partial<(typeof journal)[number]>>>({});

  const entries = useMemo(
    () => journal.map((entry) => ({ ...entry, ...(entryOverrides[entry.id] ?? {}) })).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    [entryOverrides, journal],
  );

  const startPrompt = (prompt: string) => {
    setEditingId(null);
    setTitle(prompt);
    setBody("");
    setMood("good");
    setComposing(true);
  };

  const startNew = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setMood("good");
    setComposing(true);
  };

  const startEdit = (entryId: string) => {
    const entry = journal.find((item) => item.id === entryId);
    if (!entry) {
      return;
    }
    setEditingId(entry.id);
    setTitle(entry.title);
    setBody(entry.body);
    setMood(moodFor(entry.mood).key);
    setComposing(true);
  };

  const save = () => {
    if (!title.trim()) {
      return;
    }
    if (editingId) {
      const patch = { title: title.trim(), body: body.trim(), mood };
      setEntryOverrides((current) => ({ ...current, [editingId]: patch }));
      updateJournal(editingId, patch);
    } else {
      addJournal({ title: title.trim(), body: body.trim(), mood, tags: [] });
    }
    setEditingId(null);
    setTitle("");
    setBody("");
    setMood("good");
    setComposing(false);
  };

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="eyebrow">Reflect</div>
          <h1 className="h1">Journal</h1>
        </div>
        <button className="btn btn-primary" onClick={startNew}>New entry</button>
      </div>

      {composing ? (
        <section className="card card-pad" style={{ marginBottom: 22 }}>
          <label className="field-label">Title</label>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What happened today?" />
          <label className="field-label" style={{ marginTop: 14 }}>Mood</label>
          <div style={{ display: "flex", gap: 8 }}>
            {MOODS.map((item) => (
              <button
                key={item.key}
                className="chip"
                style={{
                  borderColor: mood === item.key ? item.color : "var(--rule)",
                  background: mood === item.key ? `color-mix(in oklch, ${item.color} 14%, var(--bg-elev))` : "var(--bg-sunk)",
                }}
                onClick={() => setMood(item.key)}
              >
                <span>{item.face}</span>
                {item.label}
              </button>
            ))}
          </div>
          <label className="field-label" style={{ marginTop: 14 }}>Reflection</label>
          <textarea className="input" value={body} onChange={(event) => setBody(event.target.value)} rows={6} placeholder="Capture the lesson while it is fresh." />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            <button className="btn" onClick={() => { setEditingId(null); setComposing(false); }}>Cancel</button>
            <button className="btn btn-primary" disabled={!title.trim()} onClick={save}>{editingId ? "Save changes" : "Save entry"}</button>
          </div>
        </section>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 22 }}>
          {PROMPTS.map((prompt) => (
            <button key={prompt} className="card card-pad click-row" style={{ textAlign: "left" }} onClick={() => startPrompt(prompt)}>
              <div className="eyebrow">Prompt</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 20, lineHeight: 1.25, marginTop: 8 }}>{prompt}</div>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {entries.map((entry) => (
          <article key={entry.id} className="card card-pad" style={{ borderColor: moodFor(entry.mood).color }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div className="eyebrow">{fmt.long(entry.date)}</div>
                <h2 className="h3" style={{ marginTop: 6 }}>{entry.title}</h2>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span className="chip">
                  <span>{moodFor(entry.mood).face}</span>
                  {moodFor(entry.mood).label}
                </span>
                <button className="btn btn-sm btn-ghost" onClick={() => startEdit(entry.id)}>Edit</button>
              </div>
            </div>
            {entry.body && <p className="muted" style={{ marginTop: 12, lineHeight: 1.6 }}>{entry.body}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
