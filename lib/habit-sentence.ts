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
 * Remove trailing sentence punctuation (".", ",", ";", ":") and surrounding
 * whitespace from a field a user typed. We compose the summary sentence from
 * several blanks and add our own single full stop, so any stray period a user
 * left at the end of a blank would otherwise produce "...prompting.." — this
 * keeps the joined sentence clean regardless of how each blank was punctuated.
 */
export function stripTrailingPunctuation(text: string): string {
  return text.replace(/[\s.,;:]+$/u, "").trim();
}

/**
 * Lower-case the first letter of a clause that sits in the *middle* of the
 * summary sentence (e.g. the identity after "I'm becoming", the action after
 * "I'll", or a cue after the connector). A user who types "Read 1 page" should
 * read "I'll read 1 page", not "I'll Read 1 page".
 *
 * We deliberately leave intact:
 *  - a standalone "I" (the pronoun), and
 *  - acronyms / initialisms such as "AI" or "API" (a multi-letter word that is
 *    already all upper-case),
 * so meaningful capitalisation the user intended is never flattened.
 */
export function lowercaseFirst(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const firstWord = trimmed.split(/\s+/u)[0];
  const isPronounI = firstWord === "I";
  const isAcronym = firstWord.length > 1 && /[A-Z]/u.test(firstWord) && firstWord === firstWord.toUpperCase();
  if (isPronounI || isAcronym) return trimmed;
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

/**
 * Make a cue read as a trigger clause. A bare clause such as "I pour my coffee"
 * becomes "<defaultConnector> I pour my coffee" (e.g. "when I pour my coffee"
 * or "after I pour my coffee"), while phrases that already begin with a
 * temporal/locational connector ("after coffee", "at 7am") are returned as-is
 * so a connector is never doubled. Returns an empty string for empty input so
 * callers can omit the cue entirely.
 *
 * `defaultConnector` lets the create-habit builder honour the connector the
 * user picked from the inline dropdown (after / before / when / at / every)
 * instead of always assuming "when". It defaults to "when" so existing callers
 * (e.g. the habit-detail summary) keep their previous behaviour.
 */
export function withCueConnector(cue: string, defaultConnector = "when"): string {
  const trimmed = cue.trim();
  if (!trimmed) return "";
  return startsWithWord(trimmed, CUE_CONNECTORS) ? trimmed : `${defaultConnector} ${trimmed}`;
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
  // Each blank is normalised before we join it: trailing punctuation is
  // dropped (so we never get double full stops) and mid-sentence clauses are
  // lower-cased on their first letter (so "Read 1 page" reads "read 1 page")
  // while acronyms and the pronoun "I" survive intact.
  const identity = lowercaseFirst(stripTrailingPunctuation(habit.identity));
  const action = lowercaseFirst(stripTrailingPunctuation(habit.name)) || "show up";
  const cueRaw = withCueConnector(stripTrailingPunctuation(habit.loopCue));
  const cue = lowercaseFirst(cueRaw);
  const place = lowercaseFirst(stripTrailingPunctuation(habit.environment));

  let body = `I'll ${action}`;
  if (cue) body += ` ${cue}`;
  if (place) body += `, ${place}`;
  body += ".";

  return identity ? `I'm becoming ${identity} — ${body}` : body;
}
