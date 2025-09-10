import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { mainDb } from "../../index.ts";
import { UserNotFoundError } from "../../errors.ts";
import { getById } from "./get-by-id.ts";
import { create } from "./create.ts";

describe("getById", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = mainDb.connect();
  });

  afterEach(async () => {
    mainDb.disconnect(dbKey);
  });

  it("should return a user when found", async () => {
    // Create a test user using the create query
    const { result: createdUser } = await create(dbKey, {
      email: "test@example.com",
      name: "Test User",
    });

    expect(createdUser).toBeDefined();
    expect(createdUser?.id).toBeDefined();

    // Get the user by ID
    const { result } = await getById(dbKey, { id: createdUser!.id });

    expect(result).toBeDefined();
    expect(result?.email).toBe("test@example.com");
    expect(result?.name).toBe("Test User");
    expect(result?.id).toBe(createdUser!.id);
  });

  it("should return UserNotFoundError when user not found", async () => {
    const { error } = await getById(dbKey, { id: 999 });
    expect(error).toBeInstanceOf(UserNotFoundError);
  });
});
