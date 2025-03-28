import { eq } from "drizzle-orm";
import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { userPermissions } from "../schema.ts";

type UserPermissions = typeof userPermissions.$inferSelect;

export function createPermissionQueries(db: any) {
  return {
    // Get all permissions for a user
    getByUserId: queryWrapper(
      async (userId: number): Promise<UserPermissions[]> => {
        return db
          .select()
          .from(userPermissions)
          .where(eq(userPermissions.userId, userId));
      }
    ),

    // Add a permission to a user
    add: queryWrapper(
      async (userId: number, permissionId: number, grantedBy: number) => {
        return db.insert(userPermissions).values({
          userId,
          permissionId,
          createdAt: new Date(),
          grantedBy,
        });
      }
    ),

    // Remove a permission from a user
    remove: queryWrapper(async (userId: number, permissionId: number) => {
      return db
        .delete(userPermissions)
        .where(
          eq(userPermissions.userId, userId) &&
            eq(userPermissions.permissionId, permissionId)
        );
    }),

    // Check if a user has a specific permission
    has: queryWrapper(async (userId: number, permissionId: number) => {
      const result = await db
        .select()
        .from(userPermissions)
        .where(
          eq(userPermissions.userId, userId) &&
            eq(userPermissions.permissionId, permissionId)
        );
      return result.length > 0;
    }),
  };
}
