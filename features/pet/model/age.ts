/**
 * age.ts — turn a pet's age in milliseconds into a friendly label.
 *
 * The Pet tab shows how long each creature has been alive ("3 days old") so the
 * user feels the passage of time and the stake of keeping it going. We keep the
 * formatting pure and tiny so it can be unit-tested and reused by any card.
 */

/**
 * Human-readable age for a pet, given its age in milliseconds.
 * Rolls up minutes -> hours -> days, with a cute label for the first moments.
 */
export function formatAge(ageMs: number): string {
  const safe = ageMs > 0 ? ageMs : 0;
  const minutes = Math.floor(safe / 60_000);
  if (minutes < 1) return "Just hatched";
  if (minutes < 60) return `${minutes} min old`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} old`;

  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} old`;
}
