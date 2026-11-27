/**
 * Journal mood vocabulary.
 *
 * A journal entry stores its mood as a plain string: one of the three preset
 * keys ("good" | "meh" | "hard") or any free-form custom mood the user built
 * in the picker ("🌟 Energized", "🥰", "Calm"). Colours are NOT defined here —
 * each mood maps to a `data-mood` tone that the journal CSS modules turn into
 * a token-based `--mood-color` (see moods.module.css).
 */

/** Visual tone used to pick the token-based mood colour in CSS. */
export type MoodTone = "good" | "meh" | "hard" | "custom";

export interface MoodMeta {
  key: string;
  label: string;
  face: string;
  tone: MoodTone;
}

/** The three preset moods, in picker order. */
export const PRESET_MOODS: readonly MoodMeta[] = [
  { key: "good", label: "Good day", face: "😄", tone: "good" },
  { key: "meh", label: "So-so", face: "😐", tone: "meh" },
  { key: "hard", label: "Hard", face: "😕", tone: "hard" },
];

/** Mood a brand-new entry starts with. */
export const DEFAULT_MOOD = "good";

/** Emoji offered in the custom-mood grid (user content, not UI icons). */
export const EMOJI_GRID = [
  "😊", "😂", "🥰", "😍", "🤩", "😎", "🥳", "🤗",
  "😌", "😔", "😢", "😭", "😡", "🤯", "😤", "🫠",
  "🤔", "😴", "🤒", "😰", "🥺", "🫂", "💪", "🌟",
  "🙏", "✨", "🔥", "💡", "🎯", "⚡", "🌈", "❤️",
] as const;

/** Whether a mood string is one of the three preset keys. */
export function isPresetMood(key: string): boolean {
  return PRESET_MOODS.some((mood) => mood.key === key);
}

/** Look up a preset mood, or describe any custom string as its own mood. */
export function moodFor(key: string): MoodMeta {
  return PRESET_MOODS.find((mood) => mood.key === key) ?? { key, label: key, face: "", tone: "custom" };
}

/** A short run of non-alphanumeric characters is most likely an emoji. */
function isLikelyEmoji(value: string): boolean {
  return /^[^a-zA-Z0-9\s]{1,4}$/.test(value);
}

/**
 * Split a stored custom mood back into its emoji + label parts so the picker
 * can be pre-filled when the user reopens it ("🌟 Energized" → 🌟 + Energized).
 */
export function splitCustomMood(mood: string): { emoji: string; label: string } {
  const spaceIdx = mood.indexOf(" ");
  if (spaceIdx > 0) {
    return { emoji: mood.slice(0, spaceIdx), label: mood.slice(spaceIdx + 1) };
  }
  if ((EMOJI_GRID as readonly string[]).includes(mood) || isLikelyEmoji(mood)) {
    return { emoji: mood, label: "" };
  }
  return { emoji: "", label: mood };
}

/** Combine the picker parts into the stored mood string ("" when both empty). */
export function joinCustomMood(emoji: string, label: string): string {
  return [emoji, label.trim()].filter(Boolean).join(" ");
}
