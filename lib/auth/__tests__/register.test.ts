import { describe, expect, it, vi } from "vitest";

import { registerUser } from "@/lib/auth/register";
import type { AuthUserRecord } from "@/lib/repositories/users";

const createdUser: AuthUserRecord = {
  id: "user_1",
  name: "Ada",
  email: "ada@example.com",
  image: null,
  passwordHash: "hashed",
};

describe("registerUser", () => {
  it("validates edge cases before hashing or creating records", async () => {
    const hash = vi.fn(async () => "hashed");
    const createUser = vi.fn(async () => createdUser);

    const result = await registerUser(
      { name: "A", email: "bad", password: "short" },
      {
        findUserByEmail: async () => null,
        createUser,
        hash,
      },
    );

    expect(result.ok).toBe(false);
    expect(hash).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    if (!result.ok) {
      expect(result.errors?.name).toBeDefined();
      expect(result.errors?.email).toBeDefined();
      expect(result.errors?.password).toBeDefined();
    }
  });

  it("rejects duplicate normalized email without hashing password", async () => {
    const hash = vi.fn(async () => "hashed");
    const createUser = vi.fn(async () => createdUser);

    const result = await registerUser(
      { name: "Ada Lovelace", email: " ADA@EXAMPLE.COM ", password: "Valid123!" },
      {
        findUserByEmail: async () => createdUser,
        createUser,
        hash,
      },
    );

    expect(result.ok).toBe(false);
    expect(hash).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it("hashes password and creates defaults for valid new users", async () => {
    const hash = vi.fn(async () => "hashed-password");
    const createUser = vi.fn(async () => createdUser);

    const result = await registerUser(
      { name: " Ada Lovelace ", email: " ADA@EXAMPLE.COM ", password: "Valid123!" },
      {
        findUserByEmail: async () => null,
        createUser,
        hash,
      },
    );

    expect(result).toEqual({ ok: true, user: createdUser });
    expect(hash).toHaveBeenCalledWith("Valid123!");
    expect(createUser).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.com",
      passwordHash: "hashed-password",
    });
  });
});
