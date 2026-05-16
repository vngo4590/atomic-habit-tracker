import { describe, expect, it } from "vitest";

import { formatScheduleLabel } from "@/lib/schedule";

describe("empty and whitespace inputs", () => {
  it("returns Custom for an empty string", () => {
    // Given: a user has not selected any schedule
    // When: formatting an empty schedule
    // Then: it displays as Custom
    expect(formatScheduleLabel("")).toBe("Custom");
  });

  it("returns Custom for whitespace-only strings", () => {
    // Given: schedule strings that contain only spaces, tabs, or newlines
    // When: formatting each one
    // Then: they all map to Custom because no valid days are found
    expect(formatScheduleLabel("   ")).toBe("Custom");
    expect(formatScheduleLabel("\t\n ")).toBe("Custom");
    expect(formatScheduleLabel("     ")).toBe("Custom");
  });
});

describe("recognized schedule aliases", () => {
  it("normalizes Every day to Daily", () => {
    // Given: the legacy schedule label Every day
    // When: formatting it
    // Then: it is normalized to the modern Daily label
    expect(formatScheduleLabel("Every day")).toBe("Daily");
  });

  it("recognizes full week schedules as Daily", () => {
    // Given: all seven days listed in order
    // When: formatting
    // Then: it collapses to Daily
    expect(formatScheduleLabel("Sun, Mon, Tue, Wed, Thu, Fri, Sat")).toBe("Daily");
  });

  it("recognizes weekday schedules as Weekdays", () => {
    // Given: Monday through Friday
    // When: formatting
    // Then: it collapses to Weekdays
    expect(formatScheduleLabel("Mon, Tue, Wed, Thu, Fri")).toBe("Weekdays");
  });

  it("recognizes weekend schedules as Weekends", () => {
    // Given: Sunday and Saturday
    // When: formatting
    // Then: it collapses to Weekends
    expect(formatScheduleLabel("Sun, Sat")).toBe("Weekends");
  });

  it("recognizes the 3x a week pattern", () => {
    // Given: Monday, Wednesday, Friday
    // When: formatting
    // Then: it collapses to 3x a week
    expect(formatScheduleLabel("Mon, Wed, Fri")).toBe("3x a week");
  });
});

describe("unrecognized and partial inputs", () => {
  it("preserves free-text schedules that are not day lists", () => {
    // Given: a schedule written in plain English
    // When: formatting
    // Then: the trimmed text is returned unchanged
    expect(formatScheduleLabel("Whenever I feel like it")).toBe("Whenever I feel like it");
  });

  it("returns the trimmed original when no valid day abbreviations are found", () => {
    // Given: tokens that look like days but are invalid
    // When: formatting
    // Then: the original text is returned because no days matched
    expect(formatScheduleLabel("Foo, Bar, Baz")).toBe("Foo, Bar, Baz");
  });

  it("filters out invalid tokens and keeps only valid day abbreviations", () => {
    // Given: a mix of real day names and nonsense tokens
    // When: formatting
    // Then: only valid days remain, joined by commas
    expect(formatScheduleLabel("Mon, Foo, Wed, Bar")).toBe("Mon, Wed");
  });
});

describe("spacing and formatting edge cases", () => {
  it("trims extra whitespace around individual day names", () => {
    // Given: days with irregular surrounding whitespace
    // When: formatting
    // Then: whitespace is stripped and the pattern is still recognized
    expect(formatScheduleLabel("  Mon ,  Wed , Fri  ")).toBe("3x a week");
  });

  it("deduplicates repeated day names", () => {
    // Given: a schedule with duplicate days
    // When: formatting
    // Then: duplicates are removed via the internal Set
    expect(formatScheduleLabel("Mon, Mon, Tue, Tue, Wed")).toBe("Mon, Tue, Wed");
  });
});

describe("case sensitivity", () => {
  it("does not recognize lowercase day abbreviations", () => {
    // Given: lowercase day names
    // When: formatting
    // Then: they are treated as invalid tokens because matching is case-sensitive
    // NOTE: This documents current behavior. A future improvement could make matching case-insensitive.
    expect(formatScheduleLabel("mon, tue, wed")).toBe("mon, tue, wed");
  });

  it("does not recognize mixed-case day abbreviations", () => {
    // Given: mixed-case day names
    // When: formatting
    // Then: they are treated as invalid tokens
    expect(formatScheduleLabel("MON, TUE")).toBe("MON, TUE");
    expect(formatScheduleLabel("MoN, TuE")).toBe("MoN, TuE");
  });

  it("recognizes standard capitalized day abbreviations", () => {
    // Given: correctly capitalized day names
    // When: formatting
    // Then: they match known patterns
    expect(formatScheduleLabel("Mon, Tue, Wed, Thu, Fri")).toBe("Weekdays");
  });
});
