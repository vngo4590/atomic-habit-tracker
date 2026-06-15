import type { AuthUserRecord } from "@/lib/repositories/users";
import { findAuthUserByEmail } from "@/lib/repositories/users";
import { loginSchema } from "@/lib/contracts/auth";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/lib/auth/password";
import { loginThrottle } from "@/lib/security/login-throttle";
import { logger, redactEmail, redactUserId } from "@/lib/logger";

interface CredentialsDeps {
  findUserByEmail: (email: string) => Promise<AuthUserRecord | null>;
  verify: (password: string, hash: string | null | undefined) => Promise<boolean>;
  /** Account-scoped throttle gate. Returns false when the account is locked. */
  checkThrottle?: (email: string) => boolean;
  /** Records a failed attempt for a real account (drives the backoff lock). */
  recordFailure?: (email: string) => void;
  /** Clears the failure history after a successful login. */
  recordSuccess?: (email: string) => void;
}

const defaultDeps: CredentialsDeps = {
  findUserByEmail: findAuthUserByEmail,
  verify: verifyPassword,
  checkThrottle: (email) => loginThrottle.check(email).allowed,
  recordFailure: (email) => {
    loginThrottle.recordFailure(email);
  },
  recordSuccess: (email) => loginThrottle.recordSuccess(email),
};

const log = logger.child({ module: "auth.credentials" });

export async function authorizeCredentials(
  credentials: Partial<Record<"email" | "password", unknown>> | undefined,
  deps: CredentialsDeps = defaultDeps,
) {
  const parsed = loginSchema.safeParse({
    email: credentials?.email,
    password: credentials?.password,
  });

  if (!parsed.success) {
    return null;
  }

  log.debug("Authorizing credentials", {
    event: "auth.credentials.attempt",
    email: redactEmail(parsed.data.email),
  });

  // Account-scoped lockout. Distributed/rotating-IP attacks cannot dodge this by
  // changing source IP. Only real accounts with wrong passwords ever get locked,
  // so this never reveals whether an unknown email exists.
  if (deps.checkThrottle && !deps.checkThrottle(parsed.data.email)) {
    log.warn("Credential auth blocked — account temporarily locked", {
      event: "auth.credentials.locked",
      email: redactEmail(parsed.data.email),
    });
    return null;
  }

  const user = await deps.findUserByEmail(parsed.data.email);
  if (!user?.passwordHash) {
    // Run a dummy bcrypt comparison so a missing/passwordless account takes the
    // same time as a real one. This prevents attackers from distinguishing
    // "no such user" from "wrong password" by measuring the response latency.
    await deps.verify(parsed.data.password, DUMMY_PASSWORD_HASH);
    log.debug("Credential auth failed — user not found or no password", {
      event: "auth.credentials.no_user",
    });
    return null;
  }

  const valid = await deps.verify(parsed.data.password, user.passwordHash);
  if (!valid) {
    // Real account, wrong password: count it toward the backoff lock.
    deps.recordFailure?.(parsed.data.email);
    log.debug("Credential auth failed — invalid password", {
      event: "auth.credentials.invalid_password",
    });
    return null;
  }

  // Success clears the failure history so the next session starts clean.
  deps.recordSuccess?.(parsed.data.email);
  log.debug("Credential auth succeeded", {
    event: "auth.credentials.success",
    userId: redactUserId(user.id),
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
  };
}
