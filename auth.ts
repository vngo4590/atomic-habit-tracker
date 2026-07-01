import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { authorizeCredentials } from "@/lib/auth/credentials";
import { SESSION_MAX_AGE_SECONDS, SESSION_UPDATE_AGE_SECONDS } from "@/lib/auth/session-policy";
import { stampAuthToken } from "@/lib/auth/token";
import { db } from "@/lib/db/client";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
  // Exposed so `changePasswordAction` can re-issue the current session cookie with
  // a fresh `authTime` after a password change, keeping the current device signed
  // in while every other device stays revoked. `unstable_update` is next-auth v5's
  // purpose-built session-mutation primitive; the alias localises the beta API here.
  unstable_update: updateSession,
} = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    // Long max age + short update age = a sliding window. Each active request
    // re-issues the cookie with a fresh expiry, so an actively-used session
    // never expires; only inactivity beyond the max age forces a re-login.
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: (credentials) => authorizeCredentials(credentials),
    }),
  ],
  callbacks: {
    // `authTime` stamping lives in a pure helper (`stampAuthToken`) so the
    // revocation-critical behaviour is unit-testable without the NextAuth/Prisma
    // stack. Initial sign-in stamps it once; an `update` trigger (fired by
    // `updateSession` after a password change) re-stamps it to now; ordinary
    // token slides preserve it.
    jwt({ token, user, trigger }) {
      return stampAuthToken({ token, user, trigger });
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      // Surface the issue time so the Node-side gate (getCurrentUser) can reject
      // sessions issued before a "sign out everywhere" / password change.
      if (typeof token.authTime === "number") {
        session.authTime = token.authTime;
      }
      return session;
    },
  },
});
