import { queryWrapper } from "@saflib/drizzle";
import type { JobSetting } from "../../schema.ts";
import type { DbKey } from "@saflib/drizzle";
import { cronDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";

export type GetAllResult = ReturnsError<JobSetting[], never>;

export const getAll = queryWrapper(
  async (dbKey: DbKey): Promise<GetAllResult> => {
    const db = cronDbManager.get(dbKey)!;
    const result = await db.query.jobSettings.findMany();
    return { result };
  },
);
