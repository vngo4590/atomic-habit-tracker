const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const RECOGNIZED_SCHEDULES: Array<{ label: string; days: readonly string[] }> = [
  { label: "Daily", days: DAY_ORDER },
  { label: "Weekdays", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { label: "Weekends", days: ["Sun", "Sat"] },
  { label: "3x a week", days: ["Mon", "Wed", "Fri"] },
];

function normalizeScheduleDays(schedule: string) {
  const daySet = new Set(
    schedule
      .split(",")
      .map((day) => day.trim())
      .filter(Boolean),
  );

  return DAY_ORDER.filter((day) => daySet.has(day));
}

function sameDays(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((day, index) => day === right[index]);
}

export function formatScheduleLabel(schedule: string) {
  const trimmed = schedule.trim();

  if (!trimmed) {
    return "Custom";
  }

  if (trimmed === "Every day") {
    return "Daily";
  }

  const days = normalizeScheduleDays(trimmed);
  if (days.length === 0) {
    return trimmed;
  }

  const recognized = RECOGNIZED_SCHEDULES.find((item) => sameDays(days, item.days));
  return recognized?.label ?? days.join(", ");
}
