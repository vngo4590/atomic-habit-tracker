import bcrypt from "bcryptjs";

const PASSWORD_COST = 12;

/**
 * A pre-computed bcrypt hash of a throwaway value. WHY: when a login is attempted
 * for an email that does not exist (or a user with no password), we still run a
 * bcrypt comparison against this dummy hash. That keeps the response time roughly
 * constant whether or not the account exists, defeating timing attacks that would
 * otherwise let an attacker enumerate valid email addresses.
 */
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync("atomicly::timing-safe::dummy", PASSWORD_COST);

export async function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_COST);
}

export async function verifyPassword(password: string, hash: string | null | undefined) {
  if (!hash || !password) {
    return false;
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
