import type { JWT } from "next-auth/jwt";

/**
 * Reason the NextAuth `jwt` callback ran, narrowed to what we act on. Mirrors the
 * `trigger` values next-auth passes (`"signIn" | "signUp" | "update"`); it is
 * `undefined` on ordinary token slides.
 */
export type JwtTrigger = "signIn" | "signUp" | "update" | undefined;

/**
 * Pure token-stamping logic for the NextAuth `jwt` callback, extracted so the
 * revocation-critical `authTime` behaviour can be unit-tested without booting the
 * whole NextAuth + Prisma stack.
 *
 * Rules:
 * - **Initial sign-in** (`user` present): stamp `token.id` and `token.authTime`
 *   exactly once. `user` is only present on the first callback, so this survives
 *   every later token slide.
 * - **Explicit session update** (`trigger === "update"`): re-stamp
 *   `token.authTime` to now. This is what lets `changePasswordAction` keep the
 *   CURRENT device authenticated past the freshly-advanced `sessionsValidFrom`
 *   revocation cutoff (`authTime >= sessionsValidFrom` ⇒ not revoked).
 * - **Ordinary token slide** (no user, no update trigger): preserve the existing
 *   `authTime` unchanged.
 *
 * @param now Injectable clock, defaulting to `Date.now`, so tests can pin time.
 */
export function stampAuthToken(
  {
    token,
    user,
    trigger,
  }: {
    token: JWT;
    user?: { id?: string } | null;
    trigger?: JwtTrigger;
  },
  now: () => number = Date.now,
): JWT {
  if (user?.id) {
    token.id = user.id;
    token.authTime = now();
  } else if (trigger === "update") {
    token.authTime = now();
  }
  return token;
}
