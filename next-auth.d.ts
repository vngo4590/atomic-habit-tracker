import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    /** Epoch ms when this session was issued; used for server-side revocation. */
    authTime?: number;
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    /** Original sign-in time (epoch ms), stamped once and preserved across slides. */
    authTime?: number;
  }
}
