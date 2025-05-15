import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { SelectEmailAuth } from "../../types.ts";
import { emailAuth } from "../../schema.ts";
import { inArray } from "drizzle-orm";
import { authDbManager } from "../../instances.ts";
import { DbKey } from "@saflib/drizzle-sqlite3";

export const getEmailAuthByUserIds = queryWrapper(
  async (dbKey: DbKey, ids: number[]): Promise<SelectEmailAuth[]> => {
    if (ids.length === 0) {
      return [];
    }
    const db = authDbManager.get(dbKey)!;
    const result = await db
      .select()
      .from(emailAuth)
      .where(inArray(emailAuth.userId, ids))
      .execute();

    return result;
  },
);
