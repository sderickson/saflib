import { queryWrapper } from "@saflib/drizzle";
import { jobSettings, type JobSetting } from "../../schema.ts";
import type { DbKey } from "@saflib/drizzle";
import { cronDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";

export type SetEnabledResult = ReturnsError<JobSetting, never>;

/**
 * Upsert enabled flag for a cron job.
 * When enabling, pass `enabledBy` (Kratos identity id) to record authority.
 * When disabling, `enabled_by` is retained as an audit trail of who last held authority.
 */
export const setEnabled = queryWrapper(
  async (
    dbKey: DbKey,
    jobName: string,
    enabled: boolean,
    enabledBy?: string | null,
  ): Promise<SetEnabledResult> => {
    const db = cronDbManager.get(dbKey)!;
    const now = new Date();
    const values = {
      job_name: jobName,
      enabled,
      enabled_by:
        enabled && enabledBy !== undefined ? enabledBy : (null as string | null),
      created_at: now,
      updated_at: now,
    };

    const updateSet: {
      enabled: boolean;
      updated_at: Date;
      enabled_by?: string | null;
    } = {
      enabled,
      updated_at: now,
    };
    if (enabled && enabledBy !== undefined) {
      updateSet.enabled_by = enabledBy;
    }

    const result = await db
      .insert(jobSettings)
      .values(values)
      .onConflictDoUpdate({
        target: jobSettings.job_name,
        set: updateSet,
      })
      .returning();

    return { result: result[0] };
  },
);
