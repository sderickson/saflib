import { queryWrapper } from "@saflib/drizzle";
import { eq } from "drizzle-orm";
import { jobSettings } from "../../schema.ts";
import type { JobSetting, LastRunStatus } from "../../schema.ts";
import { JobSettingNotFoundError } from "../../errors.ts";
import type { DbKey } from "@saflib/drizzle";
import { cronDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";

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
      last_run_status: status,
      updated_at: now,
    };

    // Record when the tick ran. Historically only "running" stamped lastRunAt
    // (start of an inline handler). Enqueue-only ticks write success/fail
    // directly, so those statuses must stamp lastRunAt too.
    if (
      status === "running" ||
      status === "success" ||
      status === "fail" ||
      status === "timed out"
    ) {
      updateData.last_run_at = now;
    }

    const result = await db
      .update(jobSettings)
      .set(updateData)
      .where(eq(jobSettings.job_name, jobName))
      .returning();

    if (result.length === 0) {
      return { error: new JobSettingNotFoundError(jobName) };
    }

    return { result: result[0] };
  },
);
