import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { getDatabaseUrl } from "@/lib/db/config";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: InstanceType<typeof PrismaClient>;
};

/**
 * Strips Prisma-specific query parameters (like `schema`) from the database
 * URL before passing to the raw pg Pool. The pg driver doesn't understand
 * these params and they can cause unexpected connection behavior.
 */
function stripPrismaParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("schema");
    return parsed.toString();
  } catch {
    return url;
  }
}

function createPrismaClient() {
  // The @prisma/adapter-pg sends concurrent queries within implicit
  // transactions (for relation includes). In pg@8.20+ this triggers a
  // deprecation warning and can leave the connection in an inconsistent
  // state. Setting maxUses: 1 ensures each connection is destroyed after
  // a single checkout-release cycle, preventing corrupted connections from
  // being reused and causing subsequent requests to hang.
  const pool = new Pool({
    connectionString: stripPrismaParams(getDatabaseUrl()),
    max: 20,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    maxUses: 1,
    allowExitOnIdle: true,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

// Always cache on globalThis to prevent multiple PrismaClient instances
// across different module evaluations in Next.js production builds.
// (In App Router, middleware and route handlers may load modules separately.)
export const db = globalForPrisma.prisma ?? createPrismaClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = db;
}
