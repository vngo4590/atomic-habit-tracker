import { db } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import { logger, redactEmail, redactUserId } from "@/lib/logger";

type DbClient = typeof db;

export interface AuthUserRecord {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  passwordHash: string | null;
  /** Global session revocation cutoff; null means no sessions have been revoked. */
  sessionsValidFrom: Date | null;
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
}

const authUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  passwordHash: true,
  sessionsValidFrom: true,
} as const;

const log = logger.child({ module: "repo.users" });

export async function findAuthUserByEmail(email: string, client: DbClient = db): Promise<AuthUserRecord | null> {
  log.debug("Finding auth user by email", { event: "repo.user.findByEmail", email: redactEmail(email) });
  validateDatabaseUrl();

  return client.user.findUnique({
    where: { email },
    select: authUserSelect,
  });
}

export async function findAuthUserById(id: string, client: DbClient = db): Promise<AuthUserRecord | null> {
  log.debug("Finding auth user by id", { event: "repo.user.findById", userId: redactUserId(id) });
  validateDatabaseUrl();

  return client.user.findUnique({
    where: { id },
    select: authUserSelect,
  });
}

export async function createUserWithDefaults(input: CreateUserInput, client: DbClient = db): Promise<AuthUserRecord> {
  log.debug("Creating user with defaults", {
    event: "repo.user.create",
    email: redactEmail(input.email),
    hasName: Boolean(input.name),
  });
  validateDatabaseUrl();

  return client.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      preferences: { create: {} },
      identityProfile: {
        create: {
          statement: "",
          values: [],
        },
      },
    },
    select: authUserSelect,
  });
}

export async function updateUserName(id: string, name: string, client: DbClient = db): Promise<AuthUserRecord> {
  log.debug("Updating user name", {
    event: "repo.user.updateName",
    userId: redactUserId(id),
    hasName: Boolean(name),
  });
  validateDatabaseUrl();

  return client.user.update({
    where: { id },
    data: { name },
    select: authUserSelect,
  });
}

export async function updateUserPassword(id: string, passwordHash: string, client: DbClient = db): Promise<AuthUserRecord> {
  log.debug("Updating user password", { event: "repo.user.updatePassword", userId: redactUserId(id) });
  validateDatabaseUrl();

  return client.user.update({
    where: { id },
    data: { passwordHash },
    select: authUserSelect,
  });
}

/**
 * Revokes existing sessions for a user by advancing their revocation cutoff.
 * Any session whose `authTime` is strictly BEFORE the `validFrom` instant is
 * rejected on its next server request.
 *
 * By default `validFrom` is "now", which revokes EVERY existing session — this
 * powers the "sign out of all devices" security flow. A password change instead
 * passes the CURRENT device's own `authTime` as the cutoff: that keeps the
 * device that performed the change signed in (its `authTime` EQUALS the cutoff,
 * so it is not strictly `<` and survives) while every session issued BEFORE it
 * is revoked. This is deterministic and requires no re-issued cookie, so it
 * cannot lose a cookie-propagation race after a rapid, back-to-back change.
 *
 * TRADE-OFF (deliberate): because the cutoff equals the current device's
 * `authTime`, an OTHER device whose session was minted AFTER this device's login
 * (a newer `authTime`) is NOT revoked. The alternative — cutoff = now() plus a
 * re-issued current cookie — would revoke those too, but the re-issued cookie
 * races the immediate post-action navigation on a real HTTPS deployment and
 * strands the current device on /login. We accept the narrower revocation to
 * keep the change race-free. See docs/architecture/security.md.
 *
 * @param id        The user whose sessions to revoke.
 * @param validFrom The revocation cutoff. Defaults to now (revoke everything).
 * @param client    Optional transaction client.
 */
export async function revokeUserSessions(
  id: string,
  validFrom: Date = new Date(),
  client: DbClient = db,
): Promise<void> {
  log.debug("Revoking user sessions", { event: "repo.user.revokeSessions", userId: redactUserId(id) });
  validateDatabaseUrl();

  await client.user.update({
    where: { id },
    data: { sessionsValidFrom: validFrom },
  });
}
