import { queryWrapper } from "@saflib/drizzle-sqlite3";
import type { JobSetting } from "../../types.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { cronDbManager } from "../../instances.ts";

export const getAll = queryWrapper(
  async (dbKey: DbKey): Promise<JobSetting[]> => {
    const db = cronDbManager.get(dbKey)!;
    const results = await db.query.jobSettings.findMany();
    return results;
  },
);
