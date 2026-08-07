import { queryWrapper } from "@saflib/drizzle";
import { jobSettings, type JobSetting } from "../../schema.ts";
import type { DbKey } from "@saflib/drizzle";
import { cronDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";

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
      jobName,
      enabled,
      enabledBy:
        enabled && enabledBy !== undefined ? enabledBy : (null as string | null),
      createdAt: now,
      updatedAt: now,
    };

    const updateSet: {
      enabled: boolean;
      updatedAt: Date;
      enabledBy?: string | null;
    } = {
      enabled,
      updatedAt: now,
    };
    if (enabled && enabledBy !== undefined) {
      updateSet.enabledBy = enabledBy;
    }

    const result = await db
      .insert(jobSettings)
      .values(values)
      .onConflictDoUpdate({
        target: jobSettings.jobName,
        set: updateSet,
      })
      .returning();

    return { result: result[0] };
  },
);
