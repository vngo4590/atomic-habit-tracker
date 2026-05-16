"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerContainer";
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

const EMOJI_GRID = [
  "😊", "😂", "🥰", "😍", "🤩", "😎", "🥳", "🤗",
  "😌", "😔", "😢", "😭", "😡", "🤯", "😤", "🫠",
  "🤔", "😴", "🤒", "😰", "🥺", "🫂", "💪", "🌟",
  "🙏", "✨", "🔥", "💡", "🎯", "⚡", "🌈", "❤️",
];

const CUSTOM_COLOR = "oklch(65% 0.06 250)";

function moodFor(key: string) {
  const preset = MOODS.find((item) => item.key === key);
  if (preset) return preset;
  return { key, label: key, face: "", color: CUSTOM_COLOR };
}

function isPreset(key: string) {
  return MOODS.some((m) => m.key === key);
}

export default function JournalPage() {
  const { journal, addJournal, updateJournal } = useStoreContext();
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<string>("good");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customEmoji, setCustomEmoji] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [entryOverrides, setEntryOverrides] = useState<Record<string, Partial<(typeof journal)[number]>>>({});

  const entries = useMemo(
    () => journal.map((entry) => ({ ...entry, ...(entryOverrides[entry.id] ?? {}) })).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    [entryOverrides, journal],
  );

  const selectMood = (key: string) => {
    setMood(key);
    setShowEmojiPicker(false);
    setCustomEmoji("");
    setCustomLabel("");
  };

  const toggleEmojiPicker = () => {
    if (!showEmojiPicker && !isPreset(mood)) {
      // Pre-populate picker fields from the current custom mood
      const spaceIdx = mood.indexOf(" ");
      const potentialEmoji = spaceIdx > 0 ? mood.slice(0, spaceIdx) : mood;
      if (EMOJI_GRID.includes(potentialEmoji)) {
        setCustomEmoji(potentialEmoji);
        setCustomLabel(spaceIdx > 0 ? mood.slice(spaceIdx + 1) : "");
      } else {
        setCustomEmoji("");
        setCustomLabel(mood);
      }
    }
    setShowEmojiPicker((prev) => !prev);
  };

  const applyCustomMood = () => {
    const parts = [customEmoji, customLabel.trim()].filter(Boolean);
    if (parts.length === 0) return;
    setMood(parts.join(" "));
    setShowEmojiPicker(false);
    setCustomEmoji("");
    setCustomLabel("");
  };

  const resetCompose = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setMood("good");
    setShowEmojiPicker(false);
    setCustomEmoji("");
    setCustomLabel("");
    setComposing(false);
  };

  const startPrompt = (prompt: string) => {
    setEditingId(null);
    setTitle(prompt);
    setBody("");
    setMood("good");
    setShowEmojiPicker(false);
    setComposing(true);
  };

  const startNew = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setMood("good");
    setShowEmojiPicker(false);
    setComposing(true);
  };

  const startEdit = (entryId: string) => {
    const entry = journal.find((item) => item.id === entryId);
    if (!entry) return;
    setEditingId(entry.id);
    setTitle(entry.title);
    setBody(entry.body);
    setMood(entry.mood || "meh");
    setShowEmojiPicker(false);
    setCustomEmoji("");
    setCustomLabel("");
    setComposing(true);
  };

  const save = () => {
    if (!title.trim()) return;
    if (editingId) {
      const patch = { title: title.trim(), body: body.trim(), mood };
      setEntryOverrides((current) => ({ ...current, [editingId]: patch }));
      updateJournal(editingId, patch);
    } else {
      addJournal({ title: title.trim(), body: body.trim(), mood, tags: [] });
    }
    resetCompose();
  };

  const customActive = !isPreset(mood);
  const canApplyCustom = !!(customEmoji || customLabel.trim());

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}>
      <div className="page-header">
        <div>
          <div className="eyebrow">Reflect</div>
          <h1 className="h1">Journal</h1>
        </div>
        <motion.button className="btn btn-primary" onClick={startNew} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>New entry</motion.button>
      </div>

      {composing ? (
        <section className="card card-pad" style={{ marginBottom: 22 }}>
          <label className="field-label">Title</label>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What happened today?" />
          <label className="field-label" style={{ marginTop: 14 }}>Mood</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MOODS.map((item) => (
              <button
                key={item.key}
                className="chip"
                style={{
                  borderColor: mood === item.key ? item.color : "var(--rule)",
                  background: mood === item.key ? `color-mix(in oklch, ${item.color} 14%, var(--bg-elev))` : "var(--bg-sunk)",
                }}
                onClick={() => selectMood(item.key)}
              >
                <span>{item.face}</span>
                {item.label}
              </button>
            ))}
            <button
              className="chip"
              style={{
                borderColor: customActive || showEmojiPicker ? CUSTOM_COLOR : "var(--rule)",
                background: customActive || showEmojiPicker ? `color-mix(in oklch, ${CUSTOM_COLOR} 14%, var(--bg-elev))` : "var(--bg-sunk)",
              }}
              onClick={toggleEmojiPicker}
            >
              <span>{customActive ? "" : "✨"}</span>
              {customActive ? mood : "Custom"}
            </button>
          </div>

          {showEmojiPicker && (
            <div
              style={{
                marginTop: 10,
                padding: 12,
                background: "var(--bg-sunk)",
                borderRadius: 10,
                border: "1px solid var(--rule)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 8 }}>
                1. Pick an emoji
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, marginBottom: 12 }}>
                {EMOJI_GRID.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setCustomEmoji((prev) => (prev === emoji ? "" : emoji))}
                    style={{
                      fontSize: 22,
                      padding: 4,
                      borderRadius: 6,
                      border: customEmoji === emoji ? "2px solid var(--accent)" : "2px solid transparent",
                      background: customEmoji === emoji ? "color-mix(in oklch, var(--accent) 12%, var(--bg-elev))" : "transparent",
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 8 }}>
                2. Name your mood
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {customEmoji && (
                  <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{customEmoji}</span>
                )}
                <input
                  className="input"
                  style={{ flex: 1 }}
                  placeholder="e.g. Energized, Calm, Grateful"
                  value={customLabel}
                  maxLength={30}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") applyCustomMood(); }}
                />
                <button className="btn btn-sm" onClick={applyCustomMood} disabled={!canApplyCustom}>
                  Use
                </button>
              </div>
            </div>
          )}

          <label className="field-label" style={{ marginTop: 14 }}>Reflection</label>
          <textarea className="input" value={body} onChange={(event) => setBody(event.target.value)} rows={6} placeholder="Capture the lesson while it is fresh." />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            <motion.button className="btn" onClick={resetCompose} whileTap={{ scale: 0.97 }}>Cancel</motion.button>
            <motion.button className="btn btn-primary" disabled={!title.trim()} onClick={save} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>{editingId ? "Save changes" : "Save entry"}</motion.button>
          </div>
        </section>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 22 }}>
          {PROMPTS.map((prompt) => (
            <motion.button key={prompt} className="card card-pad click-row" style={{ textAlign: "left" }} onClick={() => startPrompt(prompt)} whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
              <div className="eyebrow">Prompt</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 20, lineHeight: 1.25, marginTop: 8 }}>{prompt}</div>
            </motion.button>
          ))}
        </div>
      )}

      <StaggerContainer style={{ display: "grid", gap: 14 }} staggerDelay={0.05}>
        {entries.map((entry) => (
          <StaggerItem key={entry.id}>
            <motion.article className="card card-pad" style={{ borderColor: moodFor(entry.mood).color }} whileHover={{ y: -1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
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
            </motion.article>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </motion.div>
  );
}
