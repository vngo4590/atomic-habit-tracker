"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { ExpandableText } from "@/components/ExpandableText";
import { MarkdownText } from "@/components/MarkdownText";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerContainer";
import { useStoreContext } from "@/components/StoreProvider";
import { fmt } from "@/lib/helpers";

import styles from "./page.module.css";

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

/** Look up a preset mood, or synthesise a custom mood record for any
 *  free-form string the user has saved as their mood. */
function moodFor(key: string) {
  const preset = MOODS.find((item) => item.key === key);
  if (preset) return preset;
  return { key, label: key, face: "", color: CUSTOM_COLOR };
}

/** Whether a mood key matches one of the three preset moods. */
function isPreset(key: string) {
  return MOODS.some((m) => m.key === key);
}

/**
 * JournalPage — write/edit journal entries with mood tagging.
 *
 * Two modes:
 *   - Browse: 3-up prompt cards above a chronological entry list.
 *   - Compose: a card with title + mood (preset chips or custom
 *     emoji+label picker) + reflection textarea.
 */
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

  // Merge any local optimistic overrides into the rendered entries.
  const entries = useMemo(
    () =>
      journal
        .map((entry) => ({ ...entry, ...(entryOverrides[entry.id] ?? {}) }))
        .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    [entryOverrides, journal],
  );

  const selectMood = (key: string) => {
    setMood(key);
    setShowEmojiPicker(false);
    setCustomEmoji("");
    setCustomLabel("");
  };

  // Determine whether a short string looks like an emoji rather than plain text
  // so we can pre-fill the custom emoji input when reopening the picker.
  const isLikelyEmoji = (str: string): boolean =>
    /^[^a-zA-Z0-9\s]{1,4}$/.test(str);

  const toggleEmojiPicker = () => {
    if (!showEmojiPicker && !isPreset(mood)) {
      // Pre-populate picker fields from the current custom mood
      const spaceIdx = mood.indexOf(" ");
      const potentialEmoji = spaceIdx > 0 ? mood.slice(0, spaceIdx) : mood;
      if (EMOJI_GRID.includes(potentialEmoji)) {
        setCustomEmoji(potentialEmoji);
        setCustomLabel(spaceIdx > 0 ? mood.slice(spaceIdx + 1) : "");
      } else if (spaceIdx > 0) {
        setCustomEmoji(potentialEmoji);
        setCustomLabel(mood.slice(spaceIdx + 1));
      } else if (isLikelyEmoji(mood)) {
        setCustomEmoji(mood);
        setCustomLabel("");
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="page-header">
        <div>
          <div className="eyebrow">Reflect</div>
          <h1 className="h1">Journal</h1>
        </div>
        <motion.button
          className="btn btn-primary"
          onClick={startNew}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          New entry
        </motion.button>
      </div>

      {composing ? (
        <section className={`card card-pad ${styles.composer}`}>
          <label className="field-label">Title</label>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What happened today?"
          />
          <label className={`field-label ${styles.moodLabel}`}>Mood</label>
          <div className={styles.moodRow}>
            {MOODS.map((item) => {
              const active = mood === item.key;
              return (
                <button
                  key={item.key}
                  className={`chip ${active ? styles.moodChipActive : styles.moodChip}`}
                  // Pass mood colour through as a CSS variable so the
                  // .moodChipActive class can theme generically.
                  style={{ ["--mood-color" as string]: item.color }}
                  onClick={() => selectMood(item.key)}
                >
                  <span>{item.face}</span>
                  {item.label}
                </button>
              );
            })}
            <button
              className={`chip ${customActive || showEmojiPicker ? styles.moodChipActive : styles.moodChip}`}
              style={{ ["--mood-color" as string]: CUSTOM_COLOR }}
              onClick={toggleEmojiPicker}
            >
              <span>{customActive ? "" : "✨"}</span>
              {customActive ? mood : "Custom"}
            </button>
          </div>

          {showEmojiPicker && (
            <div className={styles.pickerPanel}>
              <div className={styles.pickerInstruction}>
                1. Pick an emoji (or type your own)
              </div>
              <div className={styles.pickerScroll}>
                <div className="emoji-grid">
                  {EMOJI_GRID.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setCustomEmoji((prev) => (prev === emoji ? "" : emoji))}
                      className={`${styles.emojiBtn} ${customEmoji === emoji ? styles.emojiBtnActive : ""}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.typeRow}>
                <span className={styles.typeLabel}>Or type:</span>
                <input
                  aria-label="Custom emoji"
                  className={`input ${styles.typeInput}`}
                  placeholder="✨"
                  maxLength={4}
                  value={customEmoji}
                  onChange={(e) => setCustomEmoji(e.target.value.trim())}
                />
              </div>
              <div className={styles.pickerInstruction}>2. Name your mood</div>
              <div className={styles.nameRow}>
                {customEmoji && <span className={styles.namePreview}>{customEmoji}</span>}
                <input
                  className={`input ${styles.nameInput}`}
                  placeholder="e.g. Energized, Calm, Grateful"
                  value={customLabel}
                  maxLength={30}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyCustomMood();
                  }}
                />
                <button className="btn btn-sm" onClick={applyCustomMood} disabled={!canApplyCustom}>
                  Use
                </button>
              </div>
            </div>
          )}

          <label className={`field-label ${styles.reflectionLabel}`}>Reflection</label>
          <textarea
            className="input"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={6}
            placeholder="Capture the lesson while it is fresh."
          />
          <div className={styles.composerActions}>
            <motion.button className="btn" onClick={resetCompose} whileTap={{ scale: 0.97 }}>
              Cancel
            </motion.button>
            <motion.button
              className="btn btn-primary"
              disabled={!title.trim()}
              onClick={save}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              {editingId ? "Save changes" : "Save entry"}
            </motion.button>
          </div>
        </section>
      ) : (
        <div className={styles.promptGrid}>
          {PROMPTS.map((prompt) => (
            <motion.button
              key={prompt}
              className={`card card-pad click-row ${styles.promptCard}`}
              onClick={() => startPrompt(prompt)}
              whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="eyebrow">Prompt</div>
              <div className={styles.promptText}>{prompt}</div>
            </motion.button>
          ))}
        </div>
      )}

      <StaggerContainer className={styles.entryList} staggerDelay={0.05}>
        {entries.map((entry) => {
          const moodMeta = moodFor(entry.mood);
          return (
            <StaggerItem key={entry.id}>
              <motion.article
                className={`card card-pad ${styles.entryCard}`}
                // Entry border colour is data-driven from the mood. Pass
                // it through as --mood-color so .entryCard stays generic.
                style={{ ["--mood-color" as string]: moodMeta.color }}
                whileHover={{ y: -1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className={styles.entryHeader}>
                  <div>
                    <div className="eyebrow">{fmt.long(entry.date)}</div>
                    {/* Long titles are clamped to two lines with a toggle so
                        a sentence-style title doesn't push the body offscreen.
                        Short titles render normally with no extra UI. */}
                    <ExpandableText
                      source={entry.title}
                      previewLines={2}
                      collapsedThreshold={80}
                    >
                      <h2 className={`h3 ${styles.entryTitle}`}>{entry.title}</h2>
                    </ExpandableText>
                  </div>
                  <div className={styles.entryActions}>
                    <span className="chip">
                      <span>{moodMeta.face}</span>
                      {moodMeta.label}
                    </span>
                    <button className="btn btn-sm btn-ghost" onClick={() => startEdit(entry.id)}>
                      Edit
                    </button>
                  </div>
                </div>
                {entry.body && (
                  <div className={`muted ${styles.entryBody}`}>
                    {/* Long reflections get a Read more / Read less toggle so
                        the journal feed stays scannable when the user writes
                        in depth. */}
                    <ExpandableText
                      source={entry.body}
                      previewLines={5}
                      collapsedThreshold={240}
                    >
                      <MarkdownText>{entry.body}</MarkdownText>
                    </ExpandableText>
                  </div>
                )}
              </motion.article>
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </motion.div>
  );
}
