import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/generated/prisma/client";

const fallbackDatabaseUrl = "postgresql://postgres:postgres@localhost:5432/atomicly?schema=public";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: InstanceType<typeof PrismaClient>;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? fallbackDatabaseUrl,
  });

  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
