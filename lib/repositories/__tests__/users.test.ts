import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateUserName, updateUserPassword } from "@/lib/repositories/users";

describe("user repository updates", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/atomicly";
  });

  // ---------------------------------------------------------------------------
  // updateUserName
  // ---------------------------------------------------------------------------
  it("updates the user's name and returns the updated record", async () => {
    const db = {
      user: {
        update: vi.fn(async () => ({
          id: "user_1",
          name: "New Name",
          email: "test@example.com",
          image: null,
          passwordHash: "hash",
        })),
      },
    };

    const result = await updateUserName("user_1", "New Name", db as never);

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { name: "New Name" },
      select: { id: true, name: true, email: true, image: true, passwordHash: true },
    });
    expect(result.name).toBe("New Name");
    expect(result.email).toBe("test@example.com");
  });

  // ---------------------------------------------------------------------------
  // updateUserPassword
  // ---------------------------------------------------------------------------
  it("updates the user's password hash and returns the updated record", async () => {
    const db = {
      user: {
        update: vi.fn(async () => ({
          id: "user_1",
          name: "Alex",
          email: "test@example.com",
          image: null,
          passwordHash: "new_hash",
        })),
      },
    };

    const result = await updateUserPassword("user_1", "new_hash", db as never);

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { passwordHash: "new_hash" },
      select: { id: true, name: true, email: true, image: true, passwordHash: true },
    });
    expect(result.passwordHash).toBe("new_hash");
  });
});
