import { describe, it, expect } from "vitest";
import { AuthDB } from "../instance.ts";
import { userPermissions } from "../schema.ts";

describe("Permission Queries", () => {
  it("can add and retrieve permissions for a user", async () => {
    const db = new AuthDB();

    // Create a test user
    const user = await db.users.create({
      email: "test@example.com",
      createdAt: new Date(),
    });

    // Create an admin user who will grant permissions
    const admin = await db.users.create({
      email: "admin@example.com",
      createdAt: new Date(),
    });

    // Add admin permission to the user
    await db.permissions.add(user.id, "admin", admin.id);

    // Check if user has the permission
    const hasPermission = await db.permissions.has(user.id, "admin");
    expect(hasPermission).toBe(true);

    // Get all permissions for the user
    const permissions = await db.permissions.getByUserId(user.id);
    expect(permissions).toHaveLength(1);
    expect(permissions[0]).toMatchObject({
      userId: user.id,
      permission: "admin",
      grantedBy: admin.id,
    });
  });

  it("can remove permissions from a user", async () => {
    const db = new AuthDB();

    // Create a test user
    const user = await db.users.create({
      email: "test@example.com",
      createdAt: new Date(),
    });

    // Create an admin user who will grant permissions
    const admin = await db.users.create({
      email: "admin@example.com",
      createdAt: new Date(),
    });

    // Add admin permission to the user
    await db.permissions.add(user.id, "admin", admin.id);

    // Verify permission exists
    const hasPermissionBefore = await db.permissions.has(user.id, "admin");
    expect(hasPermissionBefore).toBe(true);

    // Remove the permission
    await db.permissions.remove(user.id, "admin");

    // Verify permission is removed
    const hasPermissionAfter = await db.permissions.has(user.id, "admin");
    expect(hasPermissionAfter).toBe(false);

    // Verify no permissions exist for the user
    const permissions = await db.permissions.getByUserId(user.id);
    expect(permissions).toHaveLength(0);
  });

  it("handles multiple permissions per user", async () => {
    const db = new AuthDB();

    // Create a test user
    const user = await db.users.create({
      email: "test@example.com",
      createdAt: new Date(),
    });

    // Create an admin user who will grant permissions
    const admin = await db.users.create({
      email: "admin@example.com",
      createdAt: new Date(),
    });

    // Add multiple permissions to the user
    await db.permissions.add(user.id, "admin", admin.id); // admin permission
    await db.permissions.add(user.id, "read", admin.id); // read permission
    await db.permissions.add(user.id, "write", admin.id); // write permission

    // Verify all permissions exist
    const hasAdminPermission = await db.permissions.has(user.id, "admin");
    const hasReadPermission = await db.permissions.has(user.id, "read");
    const hasWritePermission = await db.permissions.has(user.id, "write");

    expect(hasAdminPermission).toBe(true);
    expect(hasReadPermission).toBe(true);
    expect(hasWritePermission).toBe(true);

    // Get all permissions for the user
    const permissions = await db.permissions.getByUserId(user.id);
    expect(permissions).toHaveLength(3);
    expect(
      permissions
        .map((p: typeof userPermissions.$inferSelect) => p.permission)
        .sort()
    ).toEqual(["admin", "read", "write"]);
  });

  it("handles non-existent permissions correctly", async () => {
    const db = new AuthDB();

    // Create a test user
    const user = await db.users.create({
      email: "test@example.com",
      createdAt: new Date(),
    });

    // Check for non-existent permission
    const hasPermission = await db.permissions.has(user.id, "admin");
    expect(hasPermission).toBe(false);

    // Get all permissions for the user
    const permissions = await db.permissions.getByUserId(user.id);
    expect(permissions).toHaveLength(0);
  });
});
