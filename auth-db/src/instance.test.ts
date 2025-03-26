import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AuthDB } from "./instance.ts";
import { join } from "path";
import { unlink } from "fs/promises";

describe("AuthDB multi-instance access", () => {
  const testDbPath = join(process.cwd(), "test.db");

  beforeEach(async () => {
    // Clean up any existing test database
    try {
      await unlink(testDbPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test database after each test
    try {
      await unlink(testDbPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  it("should allow multiple instances to read and write to the same database file", async () => {
    // Create two instances pointing to the same database file
    const db1 = new AuthDB({ dbPath: testDbPath });
    const db2 = new AuthDB({ dbPath: testDbPath });

    // Create a user using the first instance
    const newUser = {
      email: "test@example.com",
      createdAt: new Date(),
    };
    const createdUser = await db1.users.create(newUser);

    // Verify the second instance can read the user
    const userFromDb2 = await db2.users.getByEmail(newUser.email);
    expect(userFromDb2).toEqual(createdUser);

    // Update the user using the second instance
    const updatedUser = await db2.users.updateLastLogin(createdUser.id);
    expect(updatedUser?.lastLoginAt).toBeDefined();

    // Verify the first instance sees the changes
    const userFromDb1 = await db1.users.getById(createdUser.id);
    expect(userFromDb1?.lastLoginAt).toBeDefined();
    expect(userFromDb1?.lastLoginAt).toEqual(updatedUser?.lastLoginAt);
  });
});
