const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function assertDateKey(value: string) {
  if (!DATE_KEY_PATTERN.test(value)) {
    throw new Error("Expected a YYYY-MM-DD date key.");
  }

  return value;
}

export function dateKeyToUtcDate(dateKey: string) {
  assertDateKey(dateKey);
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function utcDateToDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function localDateKey(date = new Date(), timeZone = "UTC") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return utcDateToDateKey(date);
  }

  return `${year}-${month}-${day}`;
}
