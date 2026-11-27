import { describe, expect, it } from "vitest";

import { FORMATION_DAYS, daysBetween, formationStatus } from "../formation";

const verdict = (formed: boolean) => ({
  habitId: "h1",
  score: 4,
  reflection: "",
  formed,
  reviewedAt: "2030-03-10",
});

describe("daysBetween", () => {
  it("counts whole days and never goes negative", () => {
    // Given / When / Then: forward ranges count days, reversed ranges clamp to 0
    expect(daysBetween("2030-01-01", "2030-01-11")).toBe(10);
    expect(daysBetween("2030-01-11", "2030-01-01")).toBe(0);
  });

  it("treats unparseable dates as day zero", () => {
    // Given: a corrupt createdAt
    // When / Then: no NaN leaks into the UI
    expect(daysBetween("not-a-date", "2030-01-01")).toBe(0);
  });
});

describe("formationStatus", () => {
  it("is still growing before day 66, with progress toward the review", () => {
    // Given: a 33-day-old habit with no verdict
    const status = formationStatus("2030-01-01", "2030-02-03", undefined);

    // Then: it is halfway to its formation review
    expect(status).toEqual({ kind: "growing", age: 33, progress: 33 / FORMATION_DAYS });
  });

  it("is ready for review from day 66", () => {
    // Given: a habit exactly 66 days old
    const status = formationStatus("2030-01-01", "2030-03-08", undefined);

    // Then: the user is invited to review it
    expect(status).toEqual({ kind: "ready", age: 66 });
  });

  it("reports the user's verdict once they have reviewed it", () => {
    // Given: reviewed habits, regardless of age
    // Then: the verdict decides formed vs not yet
    expect(formationStatus("2030-01-01", "2030-01-02", verdict(true)).kind).toBe("formed");
    expect(formationStatus("2030-01-01", "2030-06-01", verdict(false)).kind).toBe("not-yet");
  });
});
