import type { RegisterInput } from "@/lib/contracts/auth";
import { registerSchema } from "@/lib/contracts/auth";
import { hashPassword } from "@/lib/auth/password";
import { databaseSetupMessage } from "@/lib/db/config";
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

export async function registerUser(input: unknown, deps: RegisterDeps = defaultDeps): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
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
      return { ok: false, message };
    }
    throw error;
  }
  if (existing) {
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
      return { ok: false, message };
    }
    throw error;
  }

  return { ok: true, user };
}
