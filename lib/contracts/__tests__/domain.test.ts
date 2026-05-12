import { describe, expect, it } from "vitest";

import {
  checkInSchema,
  formationVerdictSchema,
  habitCreateSchema,
  habitUpdateSchema,
  identitySchema,
  journalEntrySchema,
  lessonProgressSchema,
  preferencesSchema,
  weeklyReviewSchema,
} from "@/lib/contracts/domain";

describe("domain validation contracts", () => {
  it("validates habit and check-in inputs", () => {
    expect(habitCreateSchema.safeParse({ name: "", identity: "reader" }).success).toBe(false);
    expect(habitCreateSchema.safeParse({ name: "Read", identity: "" }).success).toBe(false);
    expect(habitCreateSchema.parse({ name: "Read", identity: "reader" }).schedule).toBe("Daily");
    expect(habitUpdateSchema.parse({ cue: "After coffee" })).toEqual({ cue: "After coffee" });
    expect(habitUpdateSchema.parse({ loopResponse: "Read two pages" })).toEqual({ loopResponse: "Read two pages" });
    expect(habitUpdateSchema.parse({ contract: "Pay $5" })).toEqual({ contract: "Pay $5" });
    expect(habitUpdateSchema.safeParse({ notes: [{ id: "n1", body: "", createdAt: "2026-04-30" }] }).success).toBe(false);
    expect(habitUpdateSchema.safeParse({ notes: [{ id: "n1", body: "Keep", createdAt: "04/30/2026" }] }).success).toBe(false);
    expect(checkInSchema.safeParse({ dateKey: "2026-04-30", mood: 6 }).success).toBe(false);
    expect(checkInSchema.safeParse({ dateKey: "2026-04-30", journal: "x".repeat(2001) }).success).toBe(false);
    expect(checkInSchema.parse({ dateKey: "2026-04-30", mood: 4 }).done).toBe(true);
  });

  it("validates reflection and learning inputs", () => {
    expect(journalEntrySchema.parse({ dateKey: "2026-04-30", title: "Win" }).mood).toBe("good");
    expect(journalEntrySchema.safeParse({ dateKey: "2026-04-30", title: "" }).success).toBe(false);
    expect(journalEntrySchema.safeParse({ dateKey: "30-04-2026", title: "Win" }).success).toBe(false);
    expect(
      weeklyReviewSchema.parse({
        weekStartKey: "2026-04-24",
        wentWell: "Clear cue",
        smallestFix: "",
        identityVote: "reader",
      }).identityVote,
    ).toBe("reader");
    expect(weeklyReviewSchema.safeParse({ weekStartKey: "20260424" }).success).toBe(false);
    expect(lessonProgressSchema.safeParse({ lessonId: 0 }).success).toBe(false);
    expect(lessonProgressSchema.safeParse({ lessonId: 1.5 }).success).toBe(false);
    expect(lessonProgressSchema.parse({ lessonId: 7 }).lessonId).toBe(7);
  });

  it("validates identity, preference, and formation inputs", () => {
    expect(identitySchema.parse({ statement: "I show up", values: ["Curious"] }).values).toEqual(["Curious"]);
    expect(identitySchema.parse({ statement: "I show up" }).values).toEqual([]);
    expect(preferencesSchema.safeParse({ theme: "system" }).success).toBe(false);
    expect(preferencesSchema.safeParse({ accentHue: 361 }).success).toBe(false);
    expect(preferencesSchema.safeParse({ lessonMode: "surprise" }).success).toBe(false);
    expect(preferencesSchema.parse({ theme: "dark", accentHue: 145 }).accentHue).toBe(145);
    expect(formationVerdictSchema.safeParse({ habitId: "h1", score: 6, formed: true }).success).toBe(false);
    expect(formationVerdictSchema.safeParse({ habitId: "", score: 4, formed: true }).success).toBe(false);
    expect(formationVerdictSchema.safeParse({ habitId: "h1", score: 4, formed: true, reviewedAt: "today" }).success).toBe(false);
    expect(formationVerdictSchema.parse({ habitId: "h1", score: 4.2, formed: true }).formed).toBe(true);
  });
});
