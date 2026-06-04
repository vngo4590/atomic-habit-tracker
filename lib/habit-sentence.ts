/**
 * habit-sentence — small, pure grammar helpers used to turn the short blanks a
 * user fills in (action, cue, place, identity) into sentences that read
 * naturally wherever we show them: the create-habit builder, the habit-loop
 * recap, and the summary line at the top of the habit detail page.
 *
 * These helpers are deliberately UI-free so they can be unit tested in
 * isolation and reused by both server-rendered and client components.
 */

import type { Habit } from "@/lib/types";

/**
 * Words that already introduce a cue as a time/trigger clause. If a user's cue
 * starts with one of these we must NOT prepend another "when", otherwise we get
 * awkward output like "when after my coffee".
 */
const CUE_CONNECTORS = [
  "when",
  "whenever",
  "after",
  "before",
  "once",
  "as",
  "at",
  "in",
  "on",
  "during",
  "every",
  "each",
];

/**
 * Words that already make a craving read correctly after "I want ...". If the
 * craving starts with one of these we leave it alone; otherwise we prepend "to"
 * so a bare verb phrase like "become a reader" reads "to become a reader".
 */
const CRAVING_LEADERS = ["to", "a", "an", "the"];

/** True when `text` begins with one of `words` as a whole leading word. */
function startsWithWord(text: string, words: string[]): boolean {
  const lower = text.trim().toLowerCase();
  return words.some((word) => lower === word || lower.startsWith(`${word} `));
}

/** Capitalise only the first character, leaving the rest (e.g. "AI") untouched. */
export function capitalizeFirst(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/**
 * Make a cue read as a trigger clause. A bare clause such as "I pour my coffee"
 * becomes "when I pour my coffee", while phrases that already begin with a
 * temporal/locational connector ("after coffee", "at 7am") are returned as-is.
 * Returns an empty string for empty input so callers can omit the cue entirely.
 */
export function withCueConnector(cue: string): string {
  const trimmed = cue.trim();
  if (!trimmed) return "";
  return startsWithWord(trimmed, CUE_CONNECTORS) ? trimmed : `when ${trimmed}`;
}

/**
 * Make a craving read after "I want ...". "become a reader" becomes
 * "to become a reader"; "to feel calm" / "a clear mind" are left untouched so
 * we never produce "to to become". Returns an empty string for empty input.
 */
export function withCravingConnector(craving: string): string {
  const trimmed = craving.trim();
  if (!trimmed) return "";
  return startsWithWord(trimmed, CRAVING_LEADERS) ? trimmed : `to ${trimmed}`;
}

/**
 * Compose the human-readable summary sentence shown at the top of the habit
 * detail page. It is rebuilt from the live habit fields (so it stays accurate
 * after inline edits) rather than stored, which also means it degrades
 * gracefully for older habits and for habits missing a cue or place.
 *
 * Casing is preserved (we only add lowercase connectors) so acronyms like "AI"
 * survive intact.
 */
export function composeHabitSentence(
  habit: Pick<Habit, "identity" | "name" | "loopCue" | "environment">,
): string {
  const identity = habit.identity.trim();
  const action = habit.name.trim() || "show up";
  const cue = withCueConnector(habit.loopCue);
  const place = habit.environment.trim();

  let body = `I'll ${action}`;
  if (cue) body += ` ${cue}`;
  if (place) body += `, ${place}`;
  body += ".";

  return identity ? `I'm becoming ${identity} — ${body}` : body;
}
