import { PrismaPg } from "@prisma/adapter-pg";

import { getDatabaseUrl } from "@/lib/db/config";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: InstanceType<typeof PrismaClient>;
};

function createPrismaClient() {
  const adapter = new PrismaPg(getDatabaseUrl());

  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
