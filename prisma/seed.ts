import "dotenv/config";

import { hashPassword } from "../lib/auth/password";
import { db } from "../lib/db/client";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run development seed in production.");
  }

  const email = "dev@atomicly.local";
  const passwordHash = await hashPassword("Atomicly1!");

  await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
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

  console.log(`Development user ready: ${email} / Atomicly1!`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
