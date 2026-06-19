import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { getDatabaseUrl } from "@/lib/db/config";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { logger } from "@/lib/logger";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: InstanceType<typeof PrismaClient>;
};

const log = logger.child({ module: "db.client" });

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

/**
 * Reads a positive integer from the environment, falling back to a default.
 * Used to make the pg pool tunable per-environment without changing the safe
 * production defaults baked in below.
 */
function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createPrismaClient() {
  // The @prisma/adapter-pg sends concurrent queries within implicit
  // transactions (for relation includes). In pg@8.20+ this triggers a
  // deprecation warning and can leave the connection in an inconsistent
  // state. Setting maxUses: 1 ensures each connection is destroyed after
  // a single checkout-release cycle, preventing corrupted connections from
  // being reused and causing subsequent requests to hang.
  //
  // maxUses: 1 is safe but recycles a connection after every query. Under a
  // sustained burst (the full Playwright E2E suite against a small preview
  // Postgres) that connection churn can outpace the server's ability to accept
  // new connections, surfacing as "Connection terminated due to connection
  // timeout". Both knobs are therefore env-tunable: production keeps the safe
  // defaults (maxUses 1, 5s connect timeout), while the ephemeral preview sets
  // DB_POOL_MAX_USES high (reuse connections, slashing churn) and a longer
  // DB_POOL_CONNECTION_TIMEOUT_MS — see infra/preview.bicep.
  const pool = new Pool({
    connectionString: stripPrismaParams(getDatabaseUrl()),
    max: 20,
    connectionTimeoutMillis: envInt("DB_POOL_CONNECTION_TIMEOUT_MS", 5000),
    idleTimeoutMillis: 10000,
    maxUses: envInt("DB_POOL_MAX_USES", 1),
    allowExitOnIdle: true,
  });

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  log.debug("Database client initialized", { event: "db.client.init" });
  return client;
}

// Always cache on globalThis to prevent multiple PrismaClient instances
// across different module evaluations in Next.js production builds.
// (In App Router, middleware and route handlers may load modules separately.)
export const db = globalForPrisma.prisma ?? createPrismaClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = db;
}
