import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { authorizeCredentials } from "@/lib/auth/credentials";
import { SESSION_MAX_AGE_SECONDS, SESSION_UPDATE_AGE_SECONDS } from "@/lib/auth/session-policy";
import { db } from "@/lib/db/client";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
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
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        // Stamp the original sign-in time exactly once. `user` is only present
        // on the initial sign-in, so this survives every later token slide and
        // lets the server compare it against the user's revocation cutoff.
        token.authTime = Date.now();
      }
      return token;
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
