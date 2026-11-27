import { describe, expect, it } from "vitest";

import { buildHabitDraft, canCreate, defaultLaws } from "../build-habit-draft";
import { rankIdentities, visibleIdentities } from "../identity-suggestions";

const base = { name: " Read one page ", identity: " a reader ", cue: "", location: "", schedule: "Daily" };

describe("buildHabitDraft", () => {
  it("synthesises the four laws and loop from the short answers", () => {
    // Given: answers with a cue and a place
    const draft = buildHabitDraft({ ...base, cue: "after coffee", location: "at my desk" });
    // Then: every field the old create page produced is still produced
    expect(draft).toMatchObject({
      name: "Read one page",
      identity: "a reader",
      emoji: "•",
      time: "Morning",
      schedule: "Daily",
      cue: "After coffee, at my desk.",
      response: "Read one page",
      twoMin: "Just read one page for two minutes.",
      craving: "To become a reader.",
      reward: "A visible win I can see and feel.",
      environment: "at my desk",
      loopCue: "after coffee",
      loopCraving: "to become a reader",
      loopResponse: "Read one page",
      loopReward: "a visible win",
    });
  });

  it("falls back to a gentle default cue when none is given", () => {
    expect(buildHabitDraft(base).cue).toBe("When the moment is right.");
  });

  it("prefers non-blank law overrides and ignores blank ones", () => {
    const draft = buildHabitDraft({ ...base, laws: { reward: "  Tick the box. ", craving: "   " } });
    expect(draft.reward).toBe("Tick the box.");
    expect(draft.craving).toBe(defaultLaws(base).craving);
  });
});

describe("canCreate", () => {
  it("needs both a habit and an identity", () => {
    expect(canCreate({ name: "Read", identity: "" })).toBe(false);
    expect(canCreate({ name: "  ", identity: "a reader" })).toBe(false);
    expect(canCreate({ name: "Read", identity: "a reader" })).toBe(true);
  });
});

describe("identity suggestions", () => {
  it("ranks identities by how many habits use them and filters by substring", () => {
    const ranked = rankIdentities([{ identity: "runner" }, { identity: "reader" }, { identity: "reader" }, { identity: "" }]);
    expect(ranked).toEqual(["reader", "runner"]);
    expect(visibleIdentities(ranked, "RUN")).toEqual(["runner"]);
    expect(visibleIdentities(ranked, "", 1)).toEqual(["reader"]);
  });
});
