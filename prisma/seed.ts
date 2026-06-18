import "dotenv/config";

import { hashPassword } from "../lib/auth/password";
import { db } from "../lib/db/client";

export const DEV_USER_EMAIL = "dev@atomicly.local";
export const DEV_USER_PASSWORD = "Atomicly1!";

/**
 * Upsert the canonical development user. Exported so other scripts (e.g. the
 * E2E data-reset helper) can re-create the user after a destructive wipe
 * without re-running the rest of the seed boilerplate.
 */
export async function seedDevUser() {
  const passwordHash = await hashPassword(DEV_USER_PASSWORD);

  await db.user.upsert({
    where: { email: DEV_USER_EMAIL },
    update: {},
    create: {
      email: DEV_USER_EMAIL,
      name: "Development User",
      passwordHash,
      preferences: { create: { timezone: "UTC" } },
      identityProfile: {
        create: {
          statement: "I am someone who keeps promises to myself.",
          values: ["Consistency", "Curiosity"],
        },
      },
    },
  });

  console.log(`Development user ready: ${DEV_USER_EMAIL} / ${DEV_USER_PASSWORD}`);
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run development seed in production.");
  }

  await seedDevUser();
}

// Only execute when run directly (e.g. `tsx prisma/seed.ts`). When imported by
// another script (e.g. reset-dev-data.ts) we expose `seedDevUser` instead.
const entry = process.argv[1]?.replace(/\\/g, "/") ?? "";
if (entry.endsWith("/prisma/seed.ts") || entry.endsWith("/prisma/seed.js")) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await db.$disconnect();
    });
}
