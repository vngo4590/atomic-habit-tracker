import type { AuthUserRecord } from "@/lib/repositories/users";
import { findAuthUserByEmail } from "@/lib/repositories/users";
import { loginSchema } from "@/lib/contracts/auth";
import { verifyPassword } from "@/lib/auth/password";

interface CredentialsDeps {
  findUserByEmail: (email: string) => Promise<AuthUserRecord | null>;
  verify: (password: string, hash: string | null | undefined) => Promise<boolean>;
}

const defaultDeps: CredentialsDeps = {
  findUserByEmail: findAuthUserByEmail,
  verify: verifyPassword,
};

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

  const user = await deps.findUserByEmail(parsed.data.email);
  if (!user?.passwordHash) {
    return null;
  }

  const valid = await deps.verify(parsed.data.password, user.passwordHash);
  if (!valid) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
  };
}
