import { describe, expect, it } from "vitest";

import { dateAdd, fmt, todayKey } from "@/lib/helpers";

describe("todayKey", () => {
  it("formats Date objects as local YYYY-MM-DD keys", () => {
    expect(todayKey(new Date(2026, 3, 29, 23, 59, 59))).toBe("2026-04-29");
  });

  it("preserves date-only keys without timezone shifting", () => {
    expect(todayKey("2026-04-29")).toBe("2026-04-29");
  });
});

describe("dateAdd", () => {
  it("adds and subtracts days from date keys", () => {
    expect(dateAdd("2026-04-29", 1)).toBe("2026-04-30");
    expect(dateAdd("2026-04-29", -7)).toBe("2026-04-22");
  });

  it("handles month and leap-year boundaries", () => {
    expect(dateAdd("2026-01-31", 1)).toBe("2026-02-01");
    expect(dateAdd("2024-02-28", 1)).toBe("2024-02-29");
  });
});

describe("fmt", () => {
  it("formats long dates", () => {
    expect(fmt.long("2026-04-29")).toBe("Wednesday, April 29");
  });

  it("formats short dates", () => {
    expect(fmt.short("2026-04-29")).toBe("Apr 29");
  });

  it("formats weekdays", () => {
    expect(fmt.weekday("2026-04-29")).toBe("Wed");
  });

  it("formats times", () => {
    expect(fmt.time(new Date(2026, 3, 29, 9, 5))).toBe("9:05 AM");
  });
});
