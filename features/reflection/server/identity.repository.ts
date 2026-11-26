import "server-only";

/**
 * Identity repository — the user's identity statement and core values
 * (`IdentityProfile`).
 */

import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import { logger, redactUserId } from "@/lib/logger";
import type { Identity } from "@/lib/types";

import { identitySchema } from "../contracts";

type DbClient = typeof defaultDb;

// Keep the original module name so existing log queries and dashboards still match.
const log = logger.child({ module: "repo.reflection" });

export async function getIdentity(userId: string, db: DbClient = defaultDb): Promise<Identity> {
  log.debug("Getting identity", { event: "repo.identity.get", userId: redactUserId(userId) });
  validateDatabaseUrl();

  const record = await db.identityProfile.upsert({
    where: { userId },
    create: { userId, statement: "", values: [] },
    update: {},
  });

  return { statement: record.statement, values: record.values };
}

export async function saveIdentity(userId: string, input: Identity, db: DbClient = defaultDb) {
  log.debug("Saving identity", {
    event: "repo.identity.save",
    userId: redactUserId(userId),
    valueCount: input.values.length,
  });
  validateDatabaseUrl();
  const data = identitySchema.parse(input);

  const record = await db.identityProfile.upsert({
    where: { userId },
    create: { userId, statement: data.statement, values: data.values },
    update: { statement: data.statement, values: data.values },
  });

  return { statement: record.statement, values: record.values };
}
