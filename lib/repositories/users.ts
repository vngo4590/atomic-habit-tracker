import { db } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";

export interface AuthUserRecord {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  passwordHash: string | null;
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
} as const;

export async function findAuthUserByEmail(email: string): Promise<AuthUserRecord | null> {
  validateDatabaseUrl();

  return db.user.findUnique({
    where: { email },
    select: authUserSelect,
  });
}

export async function createUserWithDefaults(input: CreateUserInput): Promise<AuthUserRecord> {
  validateDatabaseUrl();

  return db.user.create({
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
