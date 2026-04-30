import { describe, expect, it } from "vitest";

import { DatabaseConfigurationError, databaseSetupMessage, validateDatabaseUrl } from "@/lib/db/config";

describe("database config", () => {
  it("rejects missing or generated placeholder database urls", () => {
    expect(() => validateDatabaseUrl("")).toThrow(DatabaseConfigurationError);
    expect(() => validateDatabaseUrl("postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public")).toThrow(
      "placeholder",
    );
  });

  it("rejects non-postgres urls and accepts postgres urls", () => {
    expect(() => validateDatabaseUrl("file:./dev.db")).toThrow("PostgreSQL");
    expect(validateDatabaseUrl("postgresql://postgres:postgres@localhost:5432/atomicly?schema=public")).toContain(
      "atomicly",
    );
  });

  it("maps common prisma connection failures to setup messages", () => {
    expect(databaseSetupMessage(new Error("Authentication failed against the database server"))).toContain(
      "authentication failed",
    );
    expect(databaseSetupMessage(new Error("Can't reach database server at localhost:5432"))).toContain("Cannot reach");
    expect(databaseSetupMessage(new Error("P2021 table does not exist"))).toContain("schema is missing");
  });
});
