import type { AuthUserRecord } from "@/lib/repositories/users";
import { findAuthUserByEmail } from "@/lib/repositories/users";
import { loginSchema } from "@/lib/contracts/auth";
import { verifyPassword } from "@/lib/auth/password";
import { logger, redactEmail, redactUserId } from "@/lib/logger";

interface CredentialsDeps {
  findUserByEmail: (email: string) => Promise<AuthUserRecord | null>;
  verify: (password: string, hash: string | null | undefined) => Promise<boolean>;
}

const defaultDeps: CredentialsDeps = {
  findUserByEmail: findAuthUserByEmail,
  verify: verifyPassword,
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

  const user = await deps.findUserByEmail(parsed.data.email);
  if (!user?.passwordHash) {
    log.debug("Credential auth failed — user not found or no password", {
      event: "auth.credentials.no_user",
    });
    return null;
  }

  const valid = await deps.verify(parsed.data.password, user.passwordHash);
  if (!valid) {
    log.debug("Credential auth failed — invalid password", {
      event: "auth.credentials.invalid_password",
    });
    return null;
  }

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
