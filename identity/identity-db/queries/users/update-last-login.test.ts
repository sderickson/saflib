import { vi, describe, it, expect, beforeEach } from "vitest";
import { authDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { authDb } from "../../index.ts";
import { UserNotFoundError } from "../../errors.ts";

describe("updateLastLogin", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = authDbManager.connect();
  });

  it("should update last login timestamp", async () => {
    vi.useFakeTimers();
    const user = {
      name: "Test User",
      email: "test@example.com",
      createdAt: new Date(),
    };

    const { result: created } = await authDb.users.create(dbKey, user);
    const now = new Date();
    vi.setSystemTime(now.setDate(now.getDate() + 1));
    const { result } = await authDb.users.updateLastLogin(dbKey, created!.id);
    expect(result).toBeDefined();
    expect(result?.lastLoginAt).toBeInstanceOf(Date);
    expect(result?.lastLoginAt?.getTime()).toBeGreaterThan(
      created!.createdAt.getTime(),
    );
    vi.useRealTimers();
  });

  it("should throw UserNotFoundError when id not found", async () => {
    const { error } = await authDb.users.updateLastLogin(dbKey, 999);
    expect(error).toBeInstanceOf(UserNotFoundError);
  });
});
