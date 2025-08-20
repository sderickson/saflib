import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { userPermissions } from "../../schema.ts";
import { identityDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { eq } from "drizzle-orm";

export const has = queryWrapper(
  async (dbKey: DbKey, userId: number, permission: string) => {
    const db = identityDbManager.get(dbKey)!;
    const result = await db
      .select()
      .from(userPermissions)
      .where(
        eq(userPermissions.userId, userId) &&
          eq(userPermissions.permission, permission),
      );
    return result.length > 0;
  },
);
