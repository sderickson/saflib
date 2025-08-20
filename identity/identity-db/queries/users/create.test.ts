import type { DbKey } from "@saflib/drizzle-sqlite3";
import { identityDbManager } from "../../instances.ts";
import { describe, it, expect, beforeEach } from "vitest";
import { EmailConflictError } from "../../errors.ts";
import { identityDb } from "../../index.ts";

describe("create", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDbManager.connect();
  });

  it("should create a new user", async () => {
    const newUser = {
      email: "test@example.com",
      createdAt: new Date(),
    };

    const { result } = await identityDb.users.create(dbKey, newUser);

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

    await identityDb.users.create(dbKey, user);
    const { error } = await identityDb.users.create(dbKey, user);

    expect(error).toBeInstanceOf(EmailConflictError);
  });
});
