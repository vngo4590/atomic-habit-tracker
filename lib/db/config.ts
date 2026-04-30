const GENERATED_PLACEHOLDERS = [
  "postgresql://johndoe:randompassword@localhost:5432/mydb",
  "postgres://johndoe:randompassword@localhost:5432/mydb",
];

export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

export function getDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  return env.DATABASE_URL ?? "";
}

export function validateDatabaseUrl(databaseUrl = getDatabaseUrl()) {
  if (!databaseUrl) {
    throw new DatabaseConfigurationError("DATABASE_URL is not set. Copy .env.example to .env and configure PostgreSQL.");
  }

  if (GENERATED_PLACEHOLDERS.some((placeholder) => databaseUrl.startsWith(placeholder))) {
    throw new DatabaseConfigurationError("DATABASE_URL still uses Prisma's generated placeholder credentials.");
  }

  try {
    const url = new URL(databaseUrl);
    if (!["postgresql:", "postgres:"].includes(url.protocol)) {
      throw new DatabaseConfigurationError("DATABASE_URL must use a PostgreSQL connection string.");
    }
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      throw error;
    }
    throw new DatabaseConfigurationError("DATABASE_URL is not a valid connection string.");
  }

  return databaseUrl;
}

export function databaseSetupMessage(error: unknown) {
  if (error instanceof DatabaseConfigurationError) {
    return error.message;
  }

  if (error instanceof Error) {
    if (error.message.includes("Authentication failed against the database server")) {
      return "Database authentication failed. Check DATABASE_URL credentials in .env.";
    }
    if (error.message.includes("Can't reach database server") || error.message.includes("ECONNREFUSED")) {
      return "Cannot reach PostgreSQL. Start the local database or update DATABASE_URL in .env.";
    }
    if (error.message.includes("does not exist") || error.message.includes("P2021")) {
      return "Database schema is missing. Run npm run prisma:migrate:deploy after configuring DATABASE_URL.";
    }
  }

  return null;
}
