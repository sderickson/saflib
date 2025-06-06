import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { emailAuth } from "../../schema.ts";
import { authDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import type { NewEmailAuth, SelectEmailAuth } from "../../types.ts";

export const create = queryWrapper(
  async (dbKey: DbKey, auth: NewEmailAuth): Promise<SelectEmailAuth> => {
    const db = authDbManager.get(dbKey)!;
    const result = await db.insert(emailAuth).values(auth).returning();
    return result[0];
  },
);
