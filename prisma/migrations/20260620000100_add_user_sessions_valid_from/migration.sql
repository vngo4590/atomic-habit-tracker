-- Global session revocation cutoff: any session issued before this instant is
-- rejected server-side, powering "sign out of all devices" and revoke-on-
-- password-change. Nullable so existing users keep all current sessions.
ALTER TABLE "User" ADD COLUMN "sessionsValidFrom" TIMESTAMP(3);
