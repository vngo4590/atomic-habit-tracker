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
  ["good", "Good day"],
  ["meh", "So-so"],
  ["hard", "Hard"],
] as const;

export default function JournalPage() {
  const { journal, addJournal } = useStoreContext();
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<(typeof MOODS)[number][0]>("good");

  const entries = useMemo(() => [...journal].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id), [journal]);

  const startPrompt = (prompt: string) => {
    setTitle(prompt);
    setBody("");
    setMood("good");
    setComposing(true);
  };

  const save = () => {
    if (!title.trim()) {
      return;
    }
    addJournal({ title: title.trim(), body: body.trim(), mood, tags: [] });
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
        <button className="btn btn-primary" onClick={() => setComposing(true)}>New entry</button>
      </div>

      {composing ? (
        <section className="card card-pad" style={{ marginBottom: 22 }}>
          <label className="field-label">Title</label>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What happened today?" />
          <label className="field-label" style={{ marginTop: 14 }}>Mood</label>
          <div style={{ display: "flex", gap: 8 }}>
            {MOODS.map(([key, label]) => (
              <button key={key} className={`chip ${mood === key ? "active" : ""}`} onClick={() => setMood(key)}>{label}</button>
            ))}
          </div>
          <label className="field-label" style={{ marginTop: 14 }}>Reflection</label>
          <textarea className="input" value={body} onChange={(event) => setBody(event.target.value)} rows={6} placeholder="Capture the lesson while it is fresh." />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            <button className="btn" onClick={() => setComposing(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={!title.trim()} onClick={save}>Save entry</button>
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
          <article key={entry.id} className="card card-pad">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div className="eyebrow">{fmt.long(entry.date)}</div>
                <h2 className="h3" style={{ marginTop: 6 }}>{entry.title}</h2>
              </div>
              <span className="chip">{MOODS.find(([key]) => key === entry.mood)?.[1] ?? entry.mood}</span>
            </div>
            {entry.body && <p className="muted" style={{ marginTop: 12, lineHeight: 1.6 }}>{entry.body}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
