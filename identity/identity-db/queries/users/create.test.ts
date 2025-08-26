import type { DbKey } from "@saflib/drizzle";
import { describe, it, expect, beforeEach } from "vitest";
import { EmailConflictError } from "../../errors.ts";
import { identityDb, usersDb } from "@saflib/identity-db";

describe("create", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDb.connect();
  });

  it("should create a new user", async () => {
    const newUser = {
      email: "test@example.com",
      createdAt: new Date(),
    };

    const { result } = await usersDb.create(dbKey, newUser);

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

    await usersDb.create(dbKey, user);
    const { error } = await usersDb.create(dbKey, user);

    expect(error).toBeInstanceOf(EmailConflictError);
  });
});
