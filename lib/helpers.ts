const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type DateInput = Date | string | number;

/**
 * This function pads the number value with 0 
 * @param value 
 * @returns 
 */
function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function parseDate(value: DateInput) {
  if (typeof value === "string" && DATE_KEY_PATTERN.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(value);
}

export function todayKey(date: DateInput = new Date()) {
  const value = parseDate(date);

  return [
    value.getFullYear(),
    pad2(value.getMonth() + 1),
    pad2(value.getDate()),
  ].join("-");
}

export function dateAdd(key: string, days: number) {
  const date = parseDate(key);
  date.setDate(date.getDate() + days);

  return todayKey(date);
}

export const fmt = {
  long: (date: DateInput) =>
    parseDate(date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
  short: (date: DateInput) =>
    parseDate(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  weekday: (date: DateInput) =>
    parseDate(date).toLocaleDateString("en-US", { weekday: "short" }),
  time: (date: DateInput) =>
    parseDate(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
};
