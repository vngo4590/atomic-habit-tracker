import type { RegisterInput } from "@/lib/contracts/auth";
import { registerSchema } from "@/lib/contracts/auth";
import { hashPassword } from "@/lib/auth/password";
import { databaseSetupMessage } from "@/lib/db/config";
import { logger, redactEmail } from "@/lib/logger";
import type { AuthUserRecord, CreateUserInput } from "@/lib/repositories/users";
import { createUserWithDefaults, findAuthUserByEmail } from "@/lib/repositories/users";

export type RegisterResult =
  | { ok: true; user: AuthUserRecord }
  | { ok: false; message: string; errors?: Partial<Record<keyof RegisterInput, string[]>> };

interface RegisterDeps {
  findUserByEmail: (email: string) => Promise<AuthUserRecord | null>;
  createUser: (input: CreateUserInput) => Promise<AuthUserRecord>;
  hash: (password: string) => Promise<string>;
}

const defaultDeps: RegisterDeps = {
  findUserByEmail: findAuthUserByEmail,
  createUser: createUserWithDefaults,
  hash: hashPassword,
};

const log = logger.child({ module: "auth.register" });

export async function registerUser(input: unknown, deps: RegisterDeps = defaultDeps): Promise<RegisterResult> {
  const submittedEmail =
    typeof input === "object" && input !== null && "email" in input && typeof input.email === "string"
      ? input.email
      : undefined;
  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
    log.warn("Registration validation failed", {
      event: "auth.register.failed",
      ...(submittedEmail ? { email: redactEmail(submittedEmail) } : {}),
      reason: "validation",
    });
    return {
      ok: false,
      message: "Check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  let existing: AuthUserRecord | null;
  try {
    existing = await deps.findUserByEmail(parsed.data.email);
  } catch (error) {
    const message = databaseSetupMessage(error);
    if (message) {
      log.warn("Registration failed", {
        event: "auth.register.failed",
        email: redactEmail(parsed.data.email),
        reason: message,
      });
      return { ok: false, message };
    }
    throw error;
  }
  if (existing) {
    log.warn("Registration failed", {
      event: "auth.register.failed",
      email: redactEmail(parsed.data.email),
      reason: "duplicate_email",
    });
    return {
      ok: false,
      message: "An account already exists for that email.",
      errors: { email: ["Use a different email or sign in."] },
    };
  }

  const passwordHash = await deps.hash(parsed.data.password);
  let user: AuthUserRecord;
  try {
    user = await deps.createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    });
  } catch (error) {
    const message = databaseSetupMessage(error);
    if (message) {
      log.warn("Registration failed", {
        event: "auth.register.failed",
        email: redactEmail(parsed.data.email),
        reason: message,
      });
      return { ok: false, message };
    }
    throw error;
  }

  log.info("Registration succeeded", {
    event: "auth.register.success",
    email: redactEmail(user.email),
  });
  return { ok: true, user };
}
