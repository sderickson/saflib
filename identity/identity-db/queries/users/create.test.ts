import type { DbKey } from "@saflib/drizzle-sqlite3";
import { authDbManager } from "../../instances.ts";
import { describe, it, expect, beforeEach } from "vitest";
import { EmailConflictError } from "../../errors.ts";
import { authDb } from "../../index.ts";

describe("create", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = authDbManager.connect();
  });

  it("should create a new user", async () => {
    const newUser = {
      email: "test@example.com",
      createdAt: new Date(),
    };

    const { result } = await authDb.users.create(dbKey, newUser);

    expect(result).toMatchObject({
      ...newUser,
      id: expect.any(Number),
      createdAt: expect.any(Date),
      lastLoginAt: expect.any(Date),
    });
  });

  it("should throw EmailConflictError for duplicate email", async () => {
    const user = {
      email: "test@example.com",
    };

    await authDb.users.create(dbKey, user);
    const { error } = await authDb.users.create(dbKey, user);

    expect(error).toBeInstanceOf(EmailConflictError);
  });
});
