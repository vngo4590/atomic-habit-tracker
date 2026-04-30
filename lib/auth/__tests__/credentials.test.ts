import { describe, expect, it, vi } from "vitest";

import { authorizeCredentials } from "@/lib/auth/credentials";
import type { AuthUserRecord } from "@/lib/repositories/users";

const user: AuthUserRecord = {
  id: "user_1",
  name: "Ada",
  email: "ada@example.com",
  image: null,
  passwordHash: "hash",
};

describe("authorizeCredentials", () => {
  it("normalizes email and returns a safe user for valid credentials", async () => {
    const findUserByEmail = vi.fn(async () => user);
    const verify = vi.fn(async () => true);

    const result = await authorizeCredentials(
      { email: "  ADA@EXAMPLE.COM ", password: "Valid1!" },
      { findUserByEmail, verify },
    );

    expect(findUserByEmail).toHaveBeenCalledWith("ada@example.com");
    expect(verify).toHaveBeenCalledWith("Valid1!", "hash");
    expect(result).toEqual({
      id: "user_1",
      name: "Ada",
      email: "ada@example.com",
      image: null,
    });
  });

  it("rejects malformed credentials before querying the database", async () => {
    const findUserByEmail = vi.fn(async () => user);
    const verify = vi.fn(async () => true);

    const result = await authorizeCredentials(
      { email: "not-an-email", password: "" },
      { findUserByEmail, verify },
    );

    expect(result).toBeNull();
    expect(findUserByEmail).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
  });

  it("rejects unknown users, passwordless users, and wrong passwords", async () => {
    const verify = vi.fn(async () => false);

    await expect(authorizeCredentials({ email: "a@example.com", password: "x" }, {
      findUserByEmail: async () => null,
      verify,
    })).resolves.toBeNull();

    await expect(authorizeCredentials({ email: "a@example.com", password: "x" }, {
      findUserByEmail: async () => ({ ...user, passwordHash: null }),
      verify,
    })).resolves.toBeNull();

    await expect(authorizeCredentials({ email: "a@example.com", password: "x" }, {
      findUserByEmail: async () => user,
      verify,
    })).resolves.toBeNull();
  });
});
