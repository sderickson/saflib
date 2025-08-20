import { vi, describe, it, expect, beforeEach } from "vitest";
import { identityDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { identityDb } from "../../index.ts";
import { UserNotFoundError } from "../../errors.ts";

describe("updateLastLogin", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDbManager.connect();
  });

  it("should update last login timestamp", async () => {
    vi.useFakeTimers();
    const user = {
      name: "Test User",
      email: "test@example.com",
      createdAt: new Date(),
    };

    const { result: created } = await identityDb.users.create(dbKey, user);
    const now = new Date();
    vi.setSystemTime(now.setDate(now.getDate() + 1));
    const { result } = await identityDb.users.updateLastLogin(
      dbKey,
      created!.id,
    );
    expect(result).toBeDefined();
    expect(result?.lastLoginAt).toBeInstanceOf(Date);
    expect(result?.lastLoginAt?.getTime()).toBeGreaterThan(
      created!.createdAt.getTime(),
    );
    vi.useRealTimers();
  });

  it("should throw UserNotFoundError when id not found", async () => {
    const { error } = await identityDb.users.updateLastLogin(dbKey, 999);
    expect(error).toBeInstanceOf(UserNotFoundError);
  });
});
