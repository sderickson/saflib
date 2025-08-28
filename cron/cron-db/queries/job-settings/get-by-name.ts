import { queryWrapper } from "@saflib/drizzle";
import { eq } from "drizzle-orm";
import { jobSettings, type JobSetting } from "../../schema.ts";
import { JobSettingNotFoundError } from "../../errors.ts";
import type { DbKey } from "@saflib/drizzle";
import { cronDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";

export type GetByNameResult = ReturnsError<JobSetting, JobSettingNotFoundError>;

export const getByName = queryWrapper(
  async (dbKey: DbKey, jobName: string): Promise<GetByNameResult> => {
    const db = cronDbManager.get(dbKey)!;
    const result = await db.query.jobSettings.findFirst({
      where: eq(jobSettings.jobName, jobName),
      // No columns specified, returns the whole object
    });

    if (!result) {
      return { error: new JobSettingNotFoundError(jobName) };
    }
    return { result };
  },
);
