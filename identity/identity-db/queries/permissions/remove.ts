import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { userPermissions } from "../../schema.ts";
import { identityDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { eq } from "drizzle-orm";

export const remove = queryWrapper(
  async (dbKey: DbKey, userId: number, permission: string) => {
    const db = identityDbManager.get(dbKey)!;
    return db
      .delete(userPermissions)
      .where(
        eq(userPermissions.userId, userId) &&
          eq(userPermissions.permission, permission),
      );
  },
);
