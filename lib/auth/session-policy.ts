// Absolute idle window: a session survives at most this long WITHOUT activity.
// Because SESSION_UPDATE_AGE_SECONDS is much smaller than this, every active
// request slides the cookie's expiry forward, so an actively-used session
// effectively never expires. Only true inactivity beyond this window forces a
// re-login — this is the fix for the previous hard 24h logout.
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

// How often the session cookie is re-issued ("slid") on activity. Keeping this
// well below the max age bounds token churn while still refreshing the expiry on
// any active day. updateAge < maxAge is what makes the window sliding, not fixed.
export const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60; // 1 day

/**
 * Pure server-side revocation check.
 *
 * A session is considered revoked (and must be rejected) when the user has a
 * global revocation cutoff (`sessionsValidFrom`) that is newer than the moment
 * the session was issued (`authTime`, stamped once at sign-in and preserved
 * across token slides). Bumping `sessionsValidFrom` to "now" therefore
 * invalidates every previously-issued session at once — the mechanism behind
 * "sign out of all devices" and revoke-on-password-change.
 *
 * @param authTime          Epoch ms when the session was originally issued.
 * @param sessionsValidFrom The user's revocation cutoff, or null if never revoked.
 */
export function isSessionRevoked(
  authTime: number | null | undefined,
  sessionsValidFrom: Date | null | undefined,
): boolean {
  // Never revoked → every session is valid.
  if (!sessionsValidFrom) {
    return false;
  }
  // Revoked, but this session predates the authTime stamp (e.g. a token issued
  // before this feature shipped): fail closed and require a fresh sign-in.
  if (typeof authTime !== "number") {
    return true;
  }
  return authTime < sessionsValidFrom.getTime();
}
