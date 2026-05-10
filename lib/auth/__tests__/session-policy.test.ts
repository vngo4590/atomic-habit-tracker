import { describe, expect, it } from "vitest";

import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session-policy";

describe("session policy", () => {
  it("expires sessions after one day of inactivity", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(24 * 60 * 60);
  });
});
