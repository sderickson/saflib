import { describe, it, expect, beforeEach, assert } from "vitest";
import { authDbManager } from "../../instances.ts";
import { userPermissions } from "../../schema.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { authDb } from "../../index.ts";
describe("Permission Queries", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = authDbManager.connect();
  });

  it("can add and retrieve permissions for a user", async () => {
    // Create a test user
    const { result: user } = await authDb.users.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    // Create an admin user who   will grant permissions
    const { result: admin } = await authDb.users.create(dbKey, {
      email: "admin@example.com",
    });
    assert(admin);

    // Add admin permission to the user
    await authDb.permissions.add(dbKey, user.id, "admin", admin.id);

    // Check if user has the permission
    const hasPermission = await authDb.permissions.has(dbKey, user.id, "admin");
    expect(hasPermission).toBe(true);

    // Get all permissions for the user
    const permissions = await authDb.permissions.getByUserId(dbKey, user.id);
    expect(permissions).toHaveLength(1);
    expect(permissions[0]).toMatchObject({
      userId: user.id,
      permission: "admin",
      grantedBy: admin.id,
    });
  });

  it("can remove permissions from a user", async () => {
    // Create a test user
    const { result: user } = await authDb.users.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    // Create an admin user who will grant permissions
    const { result: admin } = await authDb.users.create(dbKey, {
      email: "admin@example.com",
    });
    assert(admin);
    // Add admin permission to the user
    await authDb.permissions.add(dbKey, user.id, "admin", admin.id);

    // Verify permission exists
    const hasPermissionBefore = await authDb.permissions.has(
      dbKey,
      user.id,
      "admin",
    );
    expect(hasPermissionBefore).toBe(true);

    // Remove the permission
    await authDb.permissions.remove(dbKey, user.id, "admin");

    // Verify permission is removed
    const hasPermissionAfter = await authDb.permissions.has(
      dbKey,
      user.id,
      "admin",
    );
    expect(hasPermissionAfter).toBe(false);

    // Verify no permissions exist for the user
    const permissions = await authDb.permissions.getByUserId(dbKey, user.id);
    expect(permissions).toHaveLength(0);
  });

  it("handles multiple permissions per user", async () => {
    const { result: user } = await authDb.users.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    // Create a test user
    const { result: admin } = await authDb.users.create(dbKey, {
      email: "admin@example.com",
    });

    // Create an admin user who will grant permissions
    assert(admin);

    // Add multiple permissions to the user
    await authDb.permissions.add(dbKey, user.id, "admin", admin.id); // admin permission
    await authDb.permissions.add(dbKey, user.id, "read", admin.id); // read permission
    await authDb.permissions.add(dbKey, user.id, "write", admin.id); // write permission

    // Verify all permissions exist
    const hasAdminPermission = await authDb.permissions.has(
      dbKey,
      user.id,
      "admin",
    );
    const hasReadPermission = await authDb.permissions.has(
      dbKey,
      user.id,
      "read",
    );
    const hasWritePermission = await authDb.permissions.has(
      dbKey,
      user.id,
      "write",
    );
    expect(hasAdminPermission).toBe(true);
    expect(hasReadPermission).toBe(true);
    expect(hasWritePermission).toBe(true);

    // Get all permissions for the user
    const permissions = await authDb.permissions.getByUserId(dbKey, user.id);
    expect(permissions).toHaveLength(3);
    expect(
      permissions
        .map((p: typeof userPermissions.$inferSelect) => p.permission)
        .sort(),
    ).toEqual(["admin", "read", "write"]);
  });

  it("handles non-existent permissions correctly", async () => {
    const { result: user } = await authDb.users.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    // Check for non-existent permission

    // Check for non-existent permission
    const hasPermission = await authDb.permissions.has(dbKey, user.id, "admin");
    expect(hasPermission).toBe(false);

    // Get all permissions for the user
    const permissions = await authDb.permissions.getByUserId(dbKey, user.id);
    expect(permissions).toHaveLength(0);
  });
});
