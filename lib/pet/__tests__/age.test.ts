import { describe, expect, it } from "vitest";

import { formatAge } from "@/lib/pet/age";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * The Pet tab shows each creature's age so the user feels time passing. These
 * tests pin the friendly rollups (just hatched -> minutes -> hours -> days).
 */
describe("formatAge", () => {
  it("labels the very first moments as just hatched", () => {
    expect(formatAge(0)).toBe("Just hatched");
    expect(formatAge(30_000)).toBe("Just hatched");
  });

  it("shows minutes under an hour", () => {
    expect(formatAge(5 * MIN)).toBe("5 min old");
  });

  it("shows singular and plural hours", () => {
    expect(formatAge(1 * HOUR)).toBe("1 hour old");
    expect(formatAge(3 * HOUR)).toBe("3 hours old");
  });

  it("shows singular and plural days", () => {
    expect(formatAge(1 * DAY)).toBe("1 day old");
    expect(formatAge(5 * DAY + 3 * HOUR)).toBe("5 days old");
  });

  it("treats negative ages as just hatched", () => {
    expect(formatAge(-1000)).toBe("Just hatched");
  });
});
