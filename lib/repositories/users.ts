import { db } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";

type DbClient = typeof db;

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

export async function findAuthUserByEmail(email: string, client: DbClient = db): Promise<AuthUserRecord | null> {
  validateDatabaseUrl();

  return client.user.findUnique({
    where: { email },
    select: authUserSelect,
  });
}

export async function findAuthUserById(id: string, client: DbClient = db): Promise<AuthUserRecord | null> {
  validateDatabaseUrl();

  return client.user.findUnique({
    where: { id },
    select: authUserSelect,
  });
}

export async function createUserWithDefaults(input: CreateUserInput, client: DbClient = db): Promise<AuthUserRecord> {
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
  validateDatabaseUrl();

  return client.user.update({
    where: { id },
    data: { name },
    select: authUserSelect,
  });
}

export async function updateUserPassword(id: string, passwordHash: string, client: DbClient = db): Promise<AuthUserRecord> {
  validateDatabaseUrl();

  return client.user.update({
    where: { id },
    data: { passwordHash },
    select: authUserSelect,
  });
}
