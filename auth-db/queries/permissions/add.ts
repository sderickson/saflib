import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { userPermissions } from "../../schema.ts";
import { authDbManager } from "../../instances.ts";
import { DbKey } from "@saflib/drizzle-sqlite3";

export const add = queryWrapper(
  async (
    dbKey: DbKey,
    userId: number,
    permission: string,
    grantedBy: number,
  ) => {
    const db = authDbManager.get(dbKey)!;
    return db.insert(userPermissions).values({
      userId,
      permission,
      createdAt: new Date(),
      grantedBy,
    });
  },
);
