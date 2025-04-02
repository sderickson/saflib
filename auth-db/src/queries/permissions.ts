import { eq } from "drizzle-orm";
import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { userPermissions } from "../schema.ts";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../schema.ts";

type UserPermissions = typeof userPermissions.$inferSelect;

export function createPermissionQueries(
  db: BetterSQLite3Database<typeof schema>,
) {
  return {
    // Get all permissions for a user
    getByUserId: queryWrapper(
      async (userId: number): Promise<UserPermissions[]> => {
        return db
          .select()
          .from(userPermissions)
          .where(eq(userPermissions.userId, userId));
      },
    ),

    // Add a permission to a user
    add: queryWrapper(
      async (userId: number, permission: string, grantedBy: number) => {
        return db.insert(userPermissions).values({
          userId,
          permission,
          createdAt: new Date(),
          grantedBy,
        });
      },
    ),

    // Remove a permission from a user
    remove: queryWrapper(async (userId: number, permission: string) => {
      return db
        .delete(userPermissions)
        .where(
          eq(userPermissions.userId, userId) &&
            eq(userPermissions.permission, permission),
        );
    }),

    // Check if a user has a specific permission
    has: queryWrapper(async (userId: number, permission: string) => {
      const result = await db
        .select()
        .from(userPermissions)
        .where(
          eq(userPermissions.userId, userId) &&
            eq(userPermissions.permission, permission),
        );
      return result.length > 0;
    }),
  };
}
