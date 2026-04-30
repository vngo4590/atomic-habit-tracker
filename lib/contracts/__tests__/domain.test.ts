import { describe, expect, it } from "vitest";

import {
  checkInSchema,
  formationVerdictSchema,
  habitCreateSchema,
  identitySchema,
  journalEntrySchema,
  lessonProgressSchema,
  preferencesSchema,
  weeklyReviewSchema,
} from "@/lib/contracts/domain";

describe("domain validation contracts", () => {
  it("validates habit and check-in inputs", () => {
    expect(habitCreateSchema.safeParse({ name: "", identity: "reader" }).success).toBe(false);
    expect(habitCreateSchema.parse({ name: "Read", identity: "reader" }).schedule).toBe("Daily");
    expect(checkInSchema.safeParse({ dateKey: "2026-04-30", mood: 6 }).success).toBe(false);
    expect(checkInSchema.parse({ dateKey: "2026-04-30", mood: 4 }).done).toBe(true);
  });

  it("validates reflection and learning inputs", () => {
    expect(journalEntrySchema.parse({ dateKey: "2026-04-30", title: "Win" }).mood).toBe("good");
    expect(
      weeklyReviewSchema.parse({
        weekStartKey: "2026-04-24",
        wentWell: "Clear cue",
        smallestFix: "",
        identityVote: "reader",
      }).identityVote,
    ).toBe("reader");
    expect(lessonProgressSchema.safeParse({ lessonId: 0 }).success).toBe(false);
    expect(lessonProgressSchema.parse({ lessonId: 7 }).lessonId).toBe(7);
  });

  it("validates identity, preference, and formation inputs", () => {
    expect(identitySchema.parse({ statement: "I show up", values: ["Curious"] }).values).toEqual(["Curious"]);
    expect(preferencesSchema.safeParse({ theme: "system" }).success).toBe(false);
    expect(preferencesSchema.parse({ theme: "dark", accentHue: 145 }).accentHue).toBe(145);
    expect(formationVerdictSchema.safeParse({ habitId: "h1", score: 6, formed: true }).success).toBe(false);
    expect(formationVerdictSchema.parse({ habitId: "h1", score: 4.2, formed: true }).formed).toBe(true);
  });
});
