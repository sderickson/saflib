import { queryWrapper } from "@saflib/drizzle-sqlite3";
import type { JobSetting } from "../../types.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { cronDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";

export namespace CronDb {
  export type GetAllResult = ReturnsError<JobSetting[]>;
}

export const getAll = queryWrapper(
  async (dbKey: DbKey): Promise<CronDb.GetAllResult> => {
    const db = cronDbManager.get(dbKey)!;
    const result = await db.query.jobSettings.findMany();
    return { result };
  },
);
