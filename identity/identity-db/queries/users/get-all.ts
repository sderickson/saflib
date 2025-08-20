import { type DbKey, queryWrapper } from "@saflib/drizzle-sqlite3";
import type { User } from "../../types.ts";
import { identityDbManager } from "../../instances.ts";

export const getAll = queryWrapper(async (dbKey: DbKey): Promise<User[]> => {
  const db = identityDbManager.get(dbKey)!;
  return db.query.users.findMany().execute();
});
