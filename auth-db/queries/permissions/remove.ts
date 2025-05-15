import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { userPermissions } from "../../schema.ts";
import { authDbManager } from "../../instances.ts";
import { DbKey } from "@saflib/drizzle-sqlite3";
import { eq } from "drizzle-orm";

export const remove = queryWrapper(
  async (dbKey: DbKey, userId: number, permission: string) => {
    const db = authDbManager.get(dbKey)!;
    return db
      .delete(userPermissions)
      .where(
        eq(userPermissions.userId, userId) &&
          eq(userPermissions.permission, permission),
      );
  },
);
