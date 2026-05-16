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

// ---------------------------------------------------------------------------
// habitCreateSchema
// ---------------------------------------------------------------------------
describe("habitCreateSchema", () => {
  it("rejects an empty name", () => {
    // Given: a payload with a blank name
    const input = { name: "", identity: "reader" };

    // When + Then: parsing fails
    expect(habitCreateSchema.safeParse(input).success).toBe(false);
  });

  it("rejects a name longer than 120 characters", () => {
    // Given: a name that exceeds the 120-character limit
    const input = { name: "R".repeat(121), identity: "reader" };

    // When + Then: parsing fails
    expect(habitCreateSchema.safeParse(input).success).toBe(false);
  });

  it("accepts a valid name and identity", () => {
    // Given: a minimal valid create payload
    const input = { name: "Read one page", identity: "reader" };

    // When + Then: parsing succeeds
    expect(habitCreateSchema.safeParse(input).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// habitUpdateSchema
// ---------------------------------------------------------------------------
describe("habitUpdateSchema", () => {
  it("allows partial updates with only a subset of fields", () => {
    // Given: a patch that updates just the name
    const input = { name: "Updated name" };

    // When + Then: parsing succeeds
    expect(habitUpdateSchema.safeParse(input).success).toBe(true);
  });

  it("rejects invalid fields such as an oversized name", () => {
    // Given: a patch with an invalid name length
    const input = { name: "X".repeat(121) };

    // When + Then: parsing fails
    expect(habitUpdateSchema.safeParse(input).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkInSchema
// ---------------------------------------------------------------------------
describe("checkInSchema", () => {
  it("rejects an invalid date format", () => {
    // Given: date keys that do not match YYYY-MM-DD
    const slashDate = { dateKey: "2030/01/15" };
    const reversedDate = { dateKey: "15-01-2030" };

    // When + Then: both formats are rejected
    expect(checkInSchema.safeParse(slashDate).success).toBe(false);
    expect(checkInSchema.safeParse(reversedDate).success).toBe(false);
  });

  it("rejects mood values outside the 1-5 range", () => {
    // Given: mood values below and above the valid range
    const base = { dateKey: "2030-01-15" };

    // When + Then: 0 and 6 are rejected; 1 and 5 are accepted
    expect(checkInSchema.safeParse({ ...base, mood: 0 }).success).toBe(false);
    expect(checkInSchema.safeParse({ ...base, mood: 1 }).success).toBe(true);
    expect(checkInSchema.safeParse({ ...base, mood: 5 }).success).toBe(true);
    expect(checkInSchema.safeParse({ ...base, mood: 6 }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// journalEntrySchema
// ---------------------------------------------------------------------------
describe("journalEntrySchema", () => {
  it("rejects an empty title", () => {
    // Given: a journal entry with a blank title
    const input = { dateKey: "2030-01-15", title: "   " };

    // When + Then: parsing fails
    expect(journalEntrySchema.safeParse(input).success).toBe(false);
  });

  it("rejects a title longer than 160 characters", () => {
    // Given: a title that exceeds the 160-character limit
    const input = { dateKey: "2030-01-15", title: "T".repeat(161) };

    // When + Then: parsing fails
    expect(journalEntrySchema.safeParse(input).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// weeklyReviewSchema
// ---------------------------------------------------------------------------
describe("weeklyReviewSchema", () => {
  it("rejects an invalid weekStartKey format", () => {
    // Given: a week start key that is not YYYY-MM-DD
    const input = { weekStartKey: "01-01-2030" };

    // When + Then: parsing fails
    expect(weeklyReviewSchema.safeParse(input).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// identitySchema
// ---------------------------------------------------------------------------
describe("identitySchema", () => {
  it("requires values to be non-empty strings", () => {
    // Given: an identity with an empty string in the values array
    const input = { statement: "I am a reader.", values: [""] };

    // When + Then: parsing fails because empty strings are rejected
    expect(identitySchema.safeParse(input).success).toBe(false);
  });

  it("accepts valid non-empty values", () => {
    // Given: an identity with valid values
    const input = { statement: "I am a reader.", values: ["Consistency", "Patience"] };

    // When + Then: parsing succeeds
    expect(identitySchema.safeParse(input).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// preferencesSchema
// ---------------------------------------------------------------------------
describe("preferencesSchema", () => {
  it("rejects an invalid theme value", () => {
    // Given: a theme that is neither light nor dark
    const input = { theme: "auto" as const };

    // When + Then: parsing fails
    expect(preferencesSchema.safeParse(input).success).toBe(false);
  });

  it("rejects an accent hue greater than 360", () => {
    // Given: a hue above the valid maximum
    const input = { accentHue: 361 };

    // When + Then: parsing fails
    expect(preferencesSchema.safeParse(input).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formationVerdictSchema
// ---------------------------------------------------------------------------
describe("formationVerdictSchema", () => {
  it("rejects a score greater than 5", () => {
    // Given: a verdict with a score above the maximum
    const input = { habitId: "h1", score: 5.1, formed: true };

    // When + Then: parsing fails
    expect(formationVerdictSchema.safeParse(input).success).toBe(false);
  });

  it("rejects a negative score", () => {
    // Given: a verdict with a negative score
    const input = { habitId: "h1", score: -0.1, formed: false };

    // When + Then: parsing fails
    expect(formationVerdictSchema.safeParse(input).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// lessonProgressSchema
// ---------------------------------------------------------------------------
describe("lessonProgressSchema", () => {
  it("rejects a non-positive lessonId", () => {
    // Given: lesson ids that are zero or negative
    const zero = { lessonId: 0 };
    const negative = { lessonId: -1 };

    // When + Then: both are rejected
    expect(lessonProgressSchema.safeParse(zero).success).toBe(false);
    expect(lessonProgressSchema.safeParse(negative).success).toBe(false);
  });
});
