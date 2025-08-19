import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { eq } from "drizzle-orm";
import { jobSettings } from "../../schema.ts";
import type { JobSetting, LastRunStatus } from "../../schema.ts";
import { JobSettingNotFoundError } from "../../errors.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { cronDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";

export type SetLastRunStatusResult = ReturnsError<
  JobSetting,
  JobSettingNotFoundError
>;

export const setLastRunStatus = queryWrapper(
  async (
    dbKey: DbKey,
    jobName: string,
    status: LastRunStatus,
  ): Promise<SetLastRunStatusResult> => {
    const db = cronDbManager.get(dbKey)!;

    const now = new Date();
    const updateData: Partial<JobSetting> = {
      lastRunStatus: status,
      updatedAt: now,
    };

    // Only update lastRunAt if the status is 'running'
    if (status === "running") {
      updateData.lastRunAt = now;
    }

    const result = await db
      .update(jobSettings)
      .set(updateData)
      .where(eq(jobSettings.jobName, jobName))
      .returning();

    if (result.length === 0) {
      return { error: new JobSettingNotFoundError(jobName) };
    }

    return { result: result[0] };
  },
);
