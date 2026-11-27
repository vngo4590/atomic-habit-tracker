/**
 * build-habit-draft — turn the create wizard's answers into the habit draft
 * sent to `store.addHabit`. Pure, so the wording rules are tested directly.
 *
 * The user answers only "what, who, when, where". The four laws and the
 * habit loop are synthesised from those answers unless the user wrote their
 * own in the optional "Make it stick" step.
 */

import type { HabitDraft } from "@/lib/types";

import { capitalizeFirst, withCueConnector } from "../../model/habit-sentence";

/** Optional overrides from the "Make it stick" step. Blank = use the default. */
export interface LawOverrides {
  cue?: string;
  craving?: string;
  twoMin?: string;
  reward?: string;
}

export interface WizardAnswers {
  name: string;
  identity: string;
  cue: string;
  location: string;
  schedule: string;
  laws?: LawOverrides;
}

/** The four-law defaults generated from the answers (shown as placeholders). */
export function defaultLaws(answers: Pick<WizardAnswers, "name" | "identity" | "cue" | "location">) {
  const name = answers.name.trim();
  const identity = answers.identity.trim();
  const location = answers.location.trim();
  // Law 1 reads as a trigger, e.g. "After I pour my coffee, at my desk."
  // withCueConnector only adds "when" to a bare clause, so a typed
  // "after I pour my coffee" is never doubled.
  const cueWithConnector = withCueConnector(answers.cue.trim());
  const cueClause = cueWithConnector ? capitalizeFirst(cueWithConnector) : "When the moment is right";
  return {
    cue: location ? `${cueClause}, ${location}.` : `${cueClause}.`,
    craving: `To become ${identity}.`,
    twoMin: `Just ${name.toLowerCase()} for two minutes.`,
    reward: "A visible win I can see and feel.",
  };
}

/** True when the answers are complete enough to create a habit. */
export function canCreate(answers: Pick<WizardAnswers, "name" | "identity">): boolean {
  return Boolean(answers.name.trim() && answers.identity.trim());
}

/** Build the full habit draft. Loop fields are explicit so the detail-page
 *  summary sentence reads back exactly what the user typed. */
export function buildHabitDraft(answers: WizardAnswers): HabitDraft {
  const name = answers.name.trim();
  const identity = answers.identity.trim();
  const defaults = defaultLaws(answers);
  const pick = (key: keyof LawOverrides) => answers.laws?.[key]?.trim() || defaults[key];

  return {
    name,
    emoji: "•",
    identity,
    time: "Morning",
    schedule: answers.schedule,
    cue: pick("cue"),
    response: name,
    twoMin: pick("twoMin"),
    craving: pick("craving"),
    reward: pick("reward"),
    environment: answers.location.trim(),
    loopCue: answers.cue.trim(),
    loopCraving: `to become ${identity}`,
    loopResponse: name,
    loopReward: "a visible win",
  };
}
