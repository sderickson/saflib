import { describe, it, expect, beforeEach, assert } from "vitest";
import { identityDbManager } from "../../instances.ts";
import { userPermissions } from "../../schema.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { identityDb } from "../../index.ts";
describe("Permission Queries", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDbManager.connect();
  });

  it("can add and retrieve permissions for a user", async () => {
    // Create a test user
    const { result: user } = await identityDb.users.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    // Create an admin user who   will grant permissions
    const { result: admin } = await identityDb.users.create(dbKey, {
      email: "admin@example.com",
    });
    assert(admin);

    // Add admin permission to the user
    await identityDb.permissions.add(dbKey, user.id, "admin", admin.id);

    // Check if user has the permission
    const hasPermission = await identityDb.permissions.has(
      dbKey,
      user.id,
      "admin",
    );
    expect(hasPermission).toBe(true);

    // Get all permissions for the user
    const permissions = await identityDb.permissions.getByUserId(
      dbKey,
      user.id,
    );
    expect(permissions).toHaveLength(1);
    expect(permissions[0]).toMatchObject({
      userId: user.id,
      permission: "admin",
      grantedBy: admin.id,
    });
  });

  it("can remove permissions from a user", async () => {
    // Create a test user
    const { result: user } = await identityDb.users.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    // Create an admin user who will grant permissions
    const { result: admin } = await identityDb.users.create(dbKey, {
      email: "admin@example.com",
    });
    assert(admin);
    // Add admin permission to the user
    await identityDb.permissions.add(dbKey, user.id, "admin", admin.id);

    // Verify permission exists
    const hasPermissionBefore = await identityDb.permissions.has(
      dbKey,
      user.id,
      "admin",
    );
    expect(hasPermissionBefore).toBe(true);

    // Remove the permission
    await identityDb.permissions.remove(dbKey, user.id, "admin");

    // Verify permission is removed
    const hasPermissionAfter = await identityDb.permissions.has(
      dbKey,
      user.id,
      "admin",
    );
    expect(hasPermissionAfter).toBe(false);

    // Verify no permissions exist for the user
    const permissions = await identityDb.permissions.getByUserId(
      dbKey,
      user.id,
    );
    expect(permissions).toHaveLength(0);
  });

  it("handles multiple permissions per user", async () => {
    const { result: user } = await identityDb.users.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    // Create a test user
    const { result: admin } = await identityDb.users.create(dbKey, {
      email: "admin@example.com",
    });

    // Create an admin user who will grant permissions
    assert(admin);

    // Add multiple permissions to the user
    await identityDb.permissions.add(dbKey, user.id, "admin", admin.id); // admin permission
    await identityDb.permissions.add(dbKey, user.id, "read", admin.id); // read permission
    await identityDb.permissions.add(dbKey, user.id, "write", admin.id); // write permission

    // Verify all permissions exist
    const hasAdminPermission = await identityDb.permissions.has(
      dbKey,
      user.id,
      "admin",
    );
    const hasReadPermission = await identityDb.permissions.has(
      dbKey,
      user.id,
      "read",
    );
    const hasWritePermission = await identityDb.permissions.has(
      dbKey,
      user.id,
      "write",
    );
    expect(hasAdminPermission).toBe(true);
    expect(hasReadPermission).toBe(true);
    expect(hasWritePermission).toBe(true);

    // Get all permissions for the user
    const permissions = await identityDb.permissions.getByUserId(
      dbKey,
      user.id,
    );
    expect(permissions).toHaveLength(3);
    expect(
      permissions
        .map((p: typeof userPermissions.$inferSelect) => p.permission)
        .sort(),
    ).toEqual(["admin", "read", "write"]);
  });

  it("handles non-existent permissions correctly", async () => {
    const { result: user } = await identityDb.users.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    // Check for non-existent permission

    // Check for non-existent permission
    const hasPermission = await identityDb.permissions.has(
      dbKey,
      user.id,
      "admin",
    );
    expect(hasPermission).toBe(false);

    // Get all permissions for the user
    const permissions = await identityDb.permissions.getByUserId(
      dbKey,
      user.id,
    );
    expect(permissions).toHaveLength(0);
  });
});
