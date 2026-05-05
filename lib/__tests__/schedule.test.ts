import { describe, expect, it } from "vitest";

import { formatScheduleLabel } from "@/lib/schedule";

describe("formatScheduleLabel", () => {
  it("collapses recognizable day patterns", () => {
    expect(formatScheduleLabel("Sun, Mon, Tue, Wed, Thu, Fri, Sat")).toBe("Daily");
    expect(formatScheduleLabel("Mon, Tue, Wed, Thu, Fri")).toBe("Weekdays");
    expect(formatScheduleLabel("Sun, Sat")).toBe("Weekends");
    expect(formatScheduleLabel("Mon, Wed, Fri")).toBe("3x a week");
  });

  it("keeps custom day schedules when no known pattern matches", () => {
    expect(formatScheduleLabel("Tue, Thu")).toBe("Tue, Thu");
  });
});
