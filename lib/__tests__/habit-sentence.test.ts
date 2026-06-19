import { describe, expect, it } from "vitest";

import {
  capitalizeFirst,
  composeHabitSentence,
  lowercaseFirst,
  stripTrailingPunctuation,
  withCravingConnector,
  withCueConnector,
} from "@/lib/habit-sentence";
import type { Habit } from "@/lib/types";

// Minimal habit shape for the sentence helper (only the fields it reads).
function sentenceHabit(patch: Partial<Pick<Habit, "identity" | "name" | "loopCue" | "environment">> = {}) {
  return {
    identity: "a reader",
    name: "read 1 page",
    loopCue: "I pour my coffee",
    environment: "at my desk",
    ...patch,
  };
}

describe("withCueConnector", () => {
  it("prepends 'when' to a bare subject-verb clause", () => {
    // Given/When: a clause with no leading connector
    // Then: a "when" is supplied so it reads as a trigger
    expect(withCueConnector("I pour my coffee")).toBe("when I pour my coffee");
  });

  it("leaves a cue that already starts with a connector untouched", () => {
    // Given/When/Then: connectors like after/at/when are not doubled up
    expect(withCueConnector("after my coffee")).toBe("after my coffee");
    expect(withCueConnector("at 7am")).toBe("at 7am");
    expect(withCueConnector("when I wake up")).toBe("when I wake up");
  });

  it("returns an empty string for blank input so callers can omit the cue", () => {
    // Given/When/Then: whitespace-only input yields nothing to render
    expect(withCueConnector("   ")).toBe("");
  });

  it("honours a caller-supplied default connector for a bare clause", () => {
    // Given: the create-habit builder passes the connector the user picked
    // When/Then: a bare clause gets that connector instead of the default "when"
    expect(withCueConnector("I pour my coffee", "after")).toBe("after I pour my coffee");
    expect(withCueConnector("I pour my coffee", "before")).toBe("before I pour my coffee");
  });

  it("never doubles a connector even when a custom default is supplied", () => {
    // Given/When/Then: a cue that already starts with a connector is untouched
    expect(withCueConnector("at 7am", "after")).toBe("at 7am");
  });
});

describe("withCravingConnector", () => {
  it("prepends 'to' to a bare verb phrase so it reads after 'I want'", () => {
    // Given/When/Then: "become X" must read "to become X"
    expect(withCravingConnector("become a reader")).toBe("to become a reader");
  });

  it("does not double a phrase that already starts with to/a/an/the", () => {
    // Given/When/Then: leading articles/infinitives are preserved as-is
    expect(withCravingConnector("to feel calm")).toBe("to feel calm");
    expect(withCravingConnector("a clear mind")).toBe("a clear mind");
    expect(withCravingConnector("the payoff")).toBe("the payoff");
  });
});

describe("capitalizeFirst", () => {
  it("capitalises only the first character and preserves the rest", () => {
    // Given/When/Then: acronyms further in the string survive intact
    expect(capitalizeFirst("when I learn AI")).toBe("When I learn AI");
  });
});

describe("stripTrailingPunctuation", () => {
  it("removes a trailing full stop a user typed in a blank", () => {
    // Given/When/Then: a stray period must not survive into the joined sentence
    expect(stripTrailingPunctuation("read 1 page about ai prompting.")).toBe(
      "read 1 page about ai prompting",
    );
  });

  it("removes trailing commas, semicolons and surrounding whitespace", () => {
    // Given/When/Then: any sentence punctuation at the end is trimmed
    expect(stripTrailingPunctuation("at my desk,  ")).toBe("at my desk");
    expect(stripTrailingPunctuation("when I wake up;")).toBe("when I wake up");
  });

  it("leaves a clean phrase untouched", () => {
    // Given/When/Then: well-formed input is returned as-is
    expect(stripTrailingPunctuation("read 1 page")).toBe("read 1 page");
  });
});

describe("lowercaseFirst", () => {
  it("lower-cases a stray capital first letter mid-sentence", () => {
    // Given/When/Then: "Read 1 page" reads "read 1 page" after "I'll"
    expect(lowercaseFirst("Read 1 page")).toBe("read 1 page");
    expect(lowercaseFirst("A person who loves AI")).toBe("a person who loves AI");
  });

  it("preserves an acronym as the first word", () => {
    // Given/When/Then: "AI prompting" must not become "aI prompting"
    expect(lowercaseFirst("AI prompting")).toBe("AI prompting");
  });

  it("preserves a standalone pronoun 'I'", () => {
    // Given/When/Then: "I pour my coffee" stays grammatical
    expect(lowercaseFirst("I pour my coffee")).toBe("I pour my coffee");
  });
});

describe("composeHabitSentence", () => {
  it("builds the identity-first plan sentence from action, cue and place", () => {
    // Given: a fully filled habit
    // When: composing the summary sentence
    // Then: it reads as one natural plan with a supplied 'when' connector
    expect(composeHabitSentence(sentenceHabit())).toBe(
      "I'm becoming a reader — I'll read 1 page when I pour my coffee, at my desk.",
    );
  });

  it("preserves acronym casing in the action and identity", () => {
    // Given: a habit referencing "AI"
    // When/Then: casing is not flattened to lowercase
    expect(
      composeHabitSentence(
        sentenceHabit({ identity: "amazing at AI", name: "read 1 page about AI", loopCue: "I open my laptop" }),
      ),
    ).toBe("I'm becoming amazing at AI — I'll read 1 page about AI when I open my laptop, at my desk.");
  });

  it("omits the cue and place when they are empty", () => {
    // Given: a habit with only identity + action
    // When/Then: the sentence still reads grammatically
    expect(composeHabitSentence(sentenceHabit({ loopCue: "", environment: "" }))).toBe(
      "I'm becoming a reader — I'll read 1 page.",
    );
  });

  it("drops the identity clause when there is no identity", () => {
    // Given: a habit without an identity
    // When/Then: it starts with the action instead of an empty becoming clause
    expect(composeHabitSentence(sentenceHabit({ identity: "" }))).toBe(
      "I'll read 1 page when I pour my coffee, at my desk.",
    );
  });

  it("cleans up messy capitalisation and trailing punctuation from user input", () => {
    // Given: blanks typed with stray capitals and a trailing full stop
    // When: composing the summary sentence
    // Then: mid-sentence clauses are lower-cased, acronyms survive, and there
    //       is exactly one full stop at the end (no "prompting..")
    expect(
      composeHabitSentence({
        identity: "A person who is amazing at AI",
        name: "Read 1 page about AI Prompting",
        loopCue: "At morning",
        environment: "at my desk.",
      }),
    ).toBe(
      "I'm becoming a person who is amazing at AI — I'll read 1 page about AI Prompting at morning, at my desk.",
    );
  });
});
