import { type DbKey, queryWrapper } from "@saflib/drizzle-sqlite3";
import type { SelectUser } from "../../types.ts";
import { authDbManager } from "../../instances.ts";

export const getAll = queryWrapper(
  async (dbKey: DbKey): Promise<SelectUser[]> => {
    const db = authDbManager.get(dbKey)!;
    return db.query.users.findMany().execute();
  },
);
