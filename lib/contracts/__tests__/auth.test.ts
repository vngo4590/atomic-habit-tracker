import { describe, expect, it } from "vitest";

import { passwordSchema, registerSchema } from "@/lib/contracts/auth";

describe("passwordSchema", () => {
  it("accepts a strong password with letter, number, and symbol", () => {
    // Given a compliant password
    expect(passwordSchema.safeParse("Valid123!").success).toBe(true);
  });

  it("rejects passwords missing a required character class", () => {
    // Given passwords that each miss one rule
    expect(passwordSchema.safeParse("alllowercase1").success).toBe(false); // no symbol
    expect(passwordSchema.safeParse("NoNumbers!").success).toBe(false); // no digit
    expect(passwordSchema.safeParse("Short1!").success).toBe(false); // too short
  });

  it("rejects passwords longer than bcrypt's 72-byte limit", () => {
    // Given a 73-byte password (bcrypt would silently truncate the tail)
    const tooLong = "Aa1!" + "x".repeat(69); // 73 bytes total
    expect(new TextEncoder().encode(tooLong).length).toBe(73);
    expect(passwordSchema.safeParse(tooLong).success).toBe(false);

    // And given exactly 72 bytes, it is accepted
    const atLimit = "Aa1!" + "x".repeat(68); // 72 bytes total
    expect(new TextEncoder().encode(atLimit).length).toBe(72);
    expect(passwordSchema.safeParse(atLimit).success).toBe(true);
  });

  it("counts multi-byte characters by byte length, not character length", () => {
    // Given a password padded with 3-byte characters that exceeds 72 bytes
    const emojiHeavy = "Aa1!" + "\u20AC".repeat(24); // 4 + 24*3 = 76 bytes
    expect(passwordSchema.safeParse(emojiHeavy).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("normalizes email casing and validates the whole form", () => {
    // Given a registration with an upper-case, padded email
    const result = registerSchema.safeParse({
      name: "Ada Lovelace",
      email: "  ADA@EXAMPLE.COM ",
      password: "Valid123!",
    });

    // Then it succeeds and the email is normalized
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("ada@example.com");
    }
  });
});
