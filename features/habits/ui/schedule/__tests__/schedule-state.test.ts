import { describe, expect, it } from "vitest";

import { scheduleLabelFromState, scheduleStateFromLabel, toggleScheduleDay } from "../schedule-state";

describe("schedule-state", () => {
  it("round-trips presets and custom day sets through the stored label", () => {
    expect(scheduleLabelFromState("daily", [])).toBe("Daily");
    expect(scheduleStateFromLabel("Weekdays")).toEqual({ preset: "weekdays", customDays: [] });
    const custom = scheduleLabelFromState("custom", ["Tue", "Thu"]);
    expect(scheduleStateFromLabel(custom)).toEqual({ preset: "custom", customDays: ["Tue", "Thu"] });
  });

  it("starts a custom selection from the preset's days when a day is toggled", () => {
    // Given: Weekdays is selected
    // When: the user taps Sat
    // Then: they get Mon–Sat (not just Sat), in week order
    expect(toggleScheduleDay("weekdays", [], "Sat")).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    // And: tapping a selected custom day removes it
    expect(toggleScheduleDay("custom", ["Mon", "Wed"], "Mon")).toEqual(["Wed"]);
  });
});
