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

  it("runs a dummy password comparison for unknown users to resist timing attacks", async () => {
    // Given a login attempt for an email that does not exist
    const verify = vi.fn(async () => false);

    await authorizeCredentials(
      { email: "ghost@example.com", password: "Whatever1!" },
      { findUserByEmail: async () => null, verify },
    );

    // Then verify() is still invoked (against the dummy hash) so the response
    // time matches that of a real account — no user-enumeration oracle.
    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledWith("Whatever1!", expect.any(String));
  });

  it("rejects immediately without hitting the database when the account is locked", async () => {
    // Given an account the throttle reports as locked
    const findUserByEmail = vi.fn(async () => user);
    const verify = vi.fn(async () => true);
    const checkThrottle = vi.fn(() => false);

    const result = await authorizeCredentials(
      { email: "ada@example.com", password: "Valid1!" },
      { findUserByEmail, verify, checkThrottle },
    );

    // Then it returns null and never queries the user or runs bcrypt
    expect(result).toBeNull();
    expect(findUserByEmail).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
  });

  it("records a failure for a real account with the wrong password", async () => {
    // Given a real account but an incorrect password
    const recordFailure = vi.fn();
    const recordSuccess = vi.fn();

    const result = await authorizeCredentials(
      { email: "ada@example.com", password: "Wrong1!" },
      {
        findUserByEmail: async () => user,
        verify: async () => false,
        checkThrottle: () => true,
        recordFailure,
        recordSuccess,
      },
    );

    // Then the failure is counted toward the backoff lock, and no success recorded
    expect(result).toBeNull();
    expect(recordFailure).toHaveBeenCalledWith("ada@example.com");
    expect(recordSuccess).not.toHaveBeenCalled();
  });

  it("clears the failure history on a successful login", async () => {
    // Given valid credentials for a real account
    const recordFailure = vi.fn();
    const recordSuccess = vi.fn();

    const result = await authorizeCredentials(
      { email: "ada@example.com", password: "Valid1!" },
      {
        findUserByEmail: async () => user,
        verify: async () => true,
        checkThrottle: () => true,
        recordFailure,
        recordSuccess,
      },
    );

    // Then the account's failure history is cleared and nothing is counted
    expect(result).not.toBeNull();
    expect(recordSuccess).toHaveBeenCalledWith("ada@example.com");
    expect(recordFailure).not.toHaveBeenCalled();
  });

  it("does not record a failure for an unknown account (no enumeration/DoS surface)", async () => {
    // Given an email that does not map to a real account
    const recordFailure = vi.fn();

    await authorizeCredentials(
      { email: "ghost@example.com", password: "Whatever1!" },
      {
        findUserByEmail: async () => null,
        verify: async () => false,
        checkThrottle: () => true,
        recordFailure,
      },
    );

    // Then no failure is recorded, so attackers cannot lock arbitrary emails
    expect(recordFailure).not.toHaveBeenCalled();
  });
});
