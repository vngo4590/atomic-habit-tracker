import { describe, expect, it } from "vitest";

import { dateAdd, todayKey } from "@/lib/helpers";

describe("todayKey with edge-case dates", () => {
  it("formats leap year February 29th correctly", () => {
    // Given: a Date object for February 29 in a leap year
    const leapDay = new Date(2024, 1, 29);

    // When + Then: the key preserves the leap day
    expect(todayKey(leapDay)).toBe("2024-02-29");
  });

  it("preserves a date-key string without re-parsing", () => {
    // Given: an already well-formed date key
    const key = "2026-04-29";

    // When + Then: passing it through todayKey returns the same string
    expect(todayKey(key)).toBe("2026-04-29");
  });

  it("produces the same key for any time within the same calendar day", () => {
    // Given: multiple times on the same calendar day
    const morning = new Date(2026, 3, 15, 6, 0, 0);
    const noon = new Date(2026, 3, 15, 12, 30, 0);
    const lateNight = new Date(2026, 3, 15, 23, 59, 59);

    // When + Then: all map to the same date key
    expect(todayKey(morning)).toBe("2026-04-15");
    expect(todayKey(noon)).toBe("2026-04-15");
    expect(todayKey(lateNight)).toBe("2026-04-15");
  });

  it("handles the very start of a year", () => {
    // Given: January 1st
    const newYear = new Date(2025, 0, 1);

    // When + Then: key is formatted correctly
    expect(todayKey(newYear)).toBe("2025-01-01");
  });

  it("handles the very end of a year", () => {
    // Given: December 31st
    const yearEnd = new Date(2025, 11, 31);

    // When + Then: key is formatted correctly
    expect(todayKey(yearEnd)).toBe("2025-12-31");
  });
});

describe("dateAdd across month and year boundaries", () => {
  it("rolls from January 31 to February 1", () => {
    // Given: the last day of January
    // When + Then: adding one day lands on February 1
    expect(dateAdd("2024-01-31", 1)).toBe("2024-02-01");
  });

  it("rolls from a non-leap year February 28 to March 1", () => {
    // Given: February 28 in a non-leap year
    // When + Then: adding one day skips the non-existent Feb 29
    expect(dateAdd("2023-02-28", 1)).toBe("2023-03-01");
  });

  it("advances from February 28 to February 29 in a leap year", () => {
    // Given: February 28 in a leap year
    // When + Then: adding one day lands on the leap day
    expect(dateAdd("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("rolls from April 30 to May 1", () => {
    // Given: the last day of a 30-day month
    // When + Then: adding one day lands on the first of the next month
    expect(dateAdd("2024-04-30", 1)).toBe("2024-05-01");
  });

  it("rolls from December 31 to January 1 of the next year", () => {
    // Given: the last day of the year
    // When + Then: adding one day advances the year
    expect(dateAdd("2024-12-31", 1)).toBe("2025-01-01");
  });

  it("goes backward from January 1 to December 31 of the previous year", () => {
    // Given: the first day of the year
    // When + Then: subtracting one day goes to the previous year
    expect(dateAdd("2025-01-01", -1)).toBe("2024-12-31");
  });

  it("handles large positive day offsets", () => {
    // Given: a starting date in a non-leap year
    // When + Then: adding 365 days lands on Jan 1 of the following year
    expect(dateAdd("2023-01-01", 365)).toBe("2024-01-01");
  });

  it("handles large negative day offsets", () => {
    // Given: a starting date at the end of a leap year
    // When + Then: subtracting 365 days lands on Jan 1 of the same leap year
    expect(dateAdd("2024-12-31", -365)).toBe("2024-01-01");
  });
});

describe("dateAdd across daylight saving time transitions", () => {
  it("advances correctly over spring-forward DST", () => {
    // Given: the day before a typical US spring-forward DST transition (second Sunday in March)
    // When: adding one day
    // Then: it lands on the DST transition day itself
    expect(dateAdd("2024-03-09", 1)).toBe("2024-03-10");
  });

  it("advances correctly over fall-back DST", () => {
    // Given: the day before a typical US fall-back DST transition (first Sunday in November)
    // When: adding one day
    // Then: it lands on the DST transition day itself
    expect(dateAdd("2024-11-02", 1)).toBe("2024-11-03");
  });

  it("advances correctly from the DST transition day to the next day", () => {
    // Given: the day of a spring-forward DST transition
    // When: adding one day
    // Then: it lands on the following day
    expect(dateAdd("2024-03-10", 1)).toBe("2024-03-11");
  });
});

describe("invalid and malformed inputs", () => {
  it("produces NaN keys for completely invalid date strings", () => {
    // Given: a string that is not a valid date
    // When: passed through the Date fallback
    // Then: JavaScript produces an invalid Date, resulting in NaN components
    // NOTE: This documents current behavior; ideally invalid inputs would throw.
    expect(todayKey("not-a-date")).toBe("NaN-NaN-NaN");
  });

  it("silently rolls invalid month-day combinations via Date constructor", () => {
    // Given: February 30, which does not exist
    // When: parsed by the Date constructor fallback
    // Then: JavaScript rolls it forward to March 1 (or March 2 in a leap year)
    // NOTE: This documents JavaScript Date behavior; ideally invalid dates would be rejected.
    expect(todayKey("2023-02-30")).toBe("2023-03-02");
    expect(todayKey("2024-02-30")).toBe("2024-03-01");
  });

  it("handles empty string by falling back to Date parsing (invalid date)", () => {
    // Given: an empty string
    // When: parsed
    // Then: it produces an invalid Date
    expect(todayKey("")).toBe("NaN-NaN-NaN");
  });
});
