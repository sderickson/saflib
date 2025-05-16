import { type DbKey, queryWrapper } from "@saflib/drizzle-sqlite3";
import { userPermissions } from "../../schema.ts";
import { eq } from "drizzle-orm";
import { authDbManager } from "../../instances.ts";
import type { UserPermissions } from "../../types.ts";

export const getByUserId = queryWrapper(
  async (dbKey: DbKey, userId: number): Promise<UserPermissions[]> => {
    const db = authDbManager.get(dbKey)!;
    return db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, userId));
  },
);
