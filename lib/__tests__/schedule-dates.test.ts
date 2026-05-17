import { beforeEach, describe, expect, it, vi } from "vitest";

import { formatNextDayLabel, isScheduledForDate, nextScheduledDateKey } from "@/lib/schedule";

describe("isScheduledForDate", () => {
  it("returns true for Daily on any day", () => {
    expect(isScheduledForDate("2026-05-17", "Daily")).toBe(true);
    expect(isScheduledForDate("2026-05-18", "Daily")).toBe(true);
    expect(isScheduledForDate("2026-05-23", "Daily")).toBe(true);
  });

  it("returns true for Every day alias on any day", () => {
    expect(isScheduledForDate("2026-05-17", "Every day")).toBe(true);
  });

  it("returns true for Weekdays only on Mon-Fri", () => {
    // 2026-05-17 is Sunday
    expect(isScheduledForDate("2026-05-17", "Weekdays")).toBe(false);
    // 2026-05-18 is Monday
    expect(isScheduledForDate("2026-05-18", "Weekdays")).toBe(true);
    // 2026-05-22 is Friday
    expect(isScheduledForDate("2026-05-22", "Weekdays")).toBe(true);
    // 2026-05-23 is Saturday
    expect(isScheduledForDate("2026-05-23", "Weekdays")).toBe(false);
  });

  it("returns true for Weekends only on Sat-Sun", () => {
    expect(isScheduledForDate("2026-05-17", "Weekends")).toBe(true); // Sun
    expect(isScheduledForDate("2026-05-18", "Weekends")).toBe(false); // Mon
    expect(isScheduledForDate("2026-05-23", "Weekends")).toBe(true); // Sat
  });

  it("returns true for 3x a week only on Mon, Wed, Fri", () => {
    expect(isScheduledForDate("2026-05-18", "3x a week")).toBe(true); // Mon
    expect(isScheduledForDate("2026-05-19", "3x a week")).toBe(false); // Tue
    expect(isScheduledForDate("2026-05-20", "3x a week")).toBe(true); // Wed
    expect(isScheduledForDate("2026-05-21", "3x a week")).toBe(false); // Thu
    expect(isScheduledForDate("2026-05-22", "3x a week")).toBe(true); // Fri
  });

  it("returns true for custom comma-separated days", () => {
    expect(isScheduledForDate("2026-05-18", "Mon, Wed")).toBe(true); // Mon
    expect(isScheduledForDate("2026-05-19", "Mon, Wed")).toBe(false); // Tue
    expect(isScheduledForDate("2026-05-20", "Mon, Wed")).toBe(true); // Wed
  });

  it("returns true for free-text schedules", () => {
    expect(isScheduledForDate("2026-05-17", "Whenever I feel like it")).toBe(true);
    expect(isScheduledForDate("2026-05-18", "Twice a month")).toBe(true);
  });
});

describe("nextScheduledDateKey", () => {
  it("finds the next day for Daily", () => {
    expect(nextScheduledDateKey("2026-05-17", "Daily")).toBe("2026-05-18");
  });

  it("finds the next weekday for Weekdays", () => {
    // Sunday -> Monday
    expect(nextScheduledDateKey("2026-05-17", "Weekdays")).toBe("2026-05-18");
    // Friday -> Monday
    expect(nextScheduledDateKey("2026-05-22", "Weekdays")).toBe("2026-05-25");
  });

  it("finds the next weekend day for Weekends", () => {
    // Sunday -> Saturday
    expect(nextScheduledDateKey("2026-05-17", "Weekends")).toBe("2026-05-23");
    // Saturday -> Sunday
    expect(nextScheduledDateKey("2026-05-23", "Weekends")).toBe("2026-05-24");
  });

  it("finds the next 3x a week day", () => {
    // Monday -> Wednesday
    expect(nextScheduledDateKey("2026-05-18", "3x a week")).toBe("2026-05-20");
    // Wednesday -> Friday
    expect(nextScheduledDateKey("2026-05-20", "3x a week")).toBe("2026-05-22");
    // Friday -> Monday
    expect(nextScheduledDateKey("2026-05-22", "3x a week")).toBe("2026-05-25");
  });

  it("finds the next custom scheduled day", () => {
    expect(nextScheduledDateKey("2026-05-18", "Mon, Thu")).toBe("2026-05-21");
  });

  it("returns null for free-text schedules", () => {
    expect(nextScheduledDateKey("2026-05-17", "Whenever I feel like it")).toBeNull();
  });
});

describe("formatNextDayLabel", () => {
  beforeEach(() => {
    // Fix today to Sunday, May 17 2026
    vi.setSystemTime(new Date(2026, 4, 17));
  });

  it('returns "Today" for the current date', () => {
    expect(formatNextDayLabel("2026-05-17")).toBe("Today");
  });

  it('returns "Tomorrow" for the next day', () => {
    expect(formatNextDayLabel("2026-05-18")).toBe("Tomorrow");
  });

  it("returns a short date for other days", () => {
    expect(formatNextDayLabel("2026-05-20")).toBe("May 20");
    expect(formatNextDayLabel("2026-06-01")).toBe("Jun 1");
  });

  it("returns empty string for null", () => {
    expect(formatNextDayLabel(null)).toBe("");
  });
});
