import "dotenv/config";

import { db } from "../lib/db/client";
import { DEV_USER_EMAIL, seedDevUser } from "./seed";

/**
 * Reset all domain data owned by the local development user, then re-seed.
 *
 * Why this exists
 * ---------------
 * Playwright E2E tests share a single dev user (`dev@atomicly.local`) and run
 * against a long-lived database in the per-PR preview environment. Several
 * specs (notably `pet.spec.ts`) assume a clean slate — e.g. "no food has been
 * earned today" — but other specs in the same run (`main-flow.spec.ts`)
 * legitimately create journal entries and weekly reviews, which the pet
 * ecosystem counts as food sources. Without a reset, the second test run for
 * the day inherits residue and Feed buttons that should be disabled appear
 * enabled.
 *
 * Implementation
 * --------------
 * The cleanest, least-fragile way to scrub every related row is to delete the
 * dev User and let Prisma's `onDelete: Cascade` relations remove habits,
 * check-ins, journal entries, weekly reviews, pets, feed logs, identity, etc.
 * Then `seedDevUser()` re-creates the user with the canonical credentials.
 *
 * Safety
 * ------
 * This script is destructive and is hard-coded to a single, well-known dev
 * email. It refuses to run if NODE_ENV is "production" so it cannot be invoked
 * against a real production database, even by accident.
 */
async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to reset dev data in production.");
  }

  // deleteMany silently succeeds (count: 0) if the user does not yet exist,
  // which keeps the script idempotent on a fresh database.
  const result = await db.user.deleteMany({ where: { email: DEV_USER_EMAIL } });
  console.log(`Removed ${result.count} existing dev user(s); domain data cascaded.`);

  await seedDevUser();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

