import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password helpers", () => {
  it("verifies the matching password and rejects wrong or empty values", async () => {
    const hash = await hashPassword("Valid123!");

    await expect(verifyPassword("Valid123!", hash)).resolves.toBe(true);
    await expect(verifyPassword("Wrong123!", hash)).resolves.toBe(false);
    await expect(verifyPassword("", hash)).resolves.toBe(false);
    await expect(verifyPassword("Valid123!", null)).resolves.toBe(false);
  });

  it("handles malformed hashes without throwing", async () => {
    await expect(verifyPassword("Valid123!", "not-a-bcrypt-hash")).resolves.toBe(false);
  });
});
