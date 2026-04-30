import { describe, expect, it } from "vitest";

import { assertDateKey, dateKeyToUtcDate, localDateKey, utcDateToDateKey } from "@/lib/date-keys";

describe("date key utilities", () => {
  it("round-trips YYYY-MM-DD keys through UTC midnight timestamps", () => {
    const date = dateKeyToUtcDate("2026-04-30");

    expect(date.toISOString()).toBe("2026-04-30T00:00:00.000Z");
    expect(utcDateToDateKey(date)).toBe("2026-04-30");
  });

  it("rejects non date-key strings", () => {
    expect(() => assertDateKey("04/30/2026")).toThrow("YYYY-MM-DD");
  });

  it("formats a date in the selected user timezone", () => {
    const date = new Date("2026-04-30T14:30:00.000Z");

    expect(localDateKey(date, "Australia/Sydney")).toBe("2026-05-01");
  });
});
